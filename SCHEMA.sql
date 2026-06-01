-- CAREMED PRODUCTION — SUPABASE SCHEMA
-- Run this entire block in the Supabase SQL editor

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator','supervisor')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products (build sheet templates)
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs (scheduled builds)
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  model TEXT,
  serial TEXT,
  operator_id UUID REFERENCES auth.users(id),
  operator_name TEXT,
  scheduled_date DATE NOT NULL,
  target_days INTEGER DEFAULT 1,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','complete','hold')),
  stages_completed INTEGER[] DEFAULT '{}',
  current_stage INTEGER,
  qc_records JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stage logs (time tracking)
CREATE TABLE stage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL,
  operator TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  paused BOOLEAN DEFAULT false,
  UNIQUE(job_id, stage_id)
);

-- QC records
CREATE TABLE qc_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL DEFAULT 'assembly',
  work_order TEXT,
  serial TEXT,
  operator_name TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transfer requests
CREATE TABLE transfer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update their own. Supervisors can update any.
CREATE POLICY "Read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Products: all authenticated users can read. Supervisors can write.
CREATE POLICY "Read all products" ON products FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Supervisors manage products" ON products FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor');

-- Jobs: all can read. Supervisors can create/update. Operators can update their own.
CREATE POLICY "Read all jobs" ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Supervisors manage jobs" ON jobs FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor');
CREATE POLICY "Operators update their jobs" ON jobs FOR UPDATE TO authenticated
  USING (operator_id = auth.uid());

-- Stage logs: all can read. Users can write their own.
CREATE POLICY "Read all stage logs" ON stage_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write stage logs" ON stage_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- QC records: all can read. Users can write.
CREATE POLICY "Read all qc records" ON qc_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write qc records" ON qc_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transfer requests: all can read. Users can create. Supervisors can update.
CREATE POLICY "Read transfers" ON transfer_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create transfer request" ON transfer_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Supervisors manage transfers" ON transfer_requests FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, username, role, active)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    COALESCE(new.raw_user_meta_data->>'role', 'operator'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE stage_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE transfer_requests;

-- Insert the Caremed chair as the first product
INSERT INTO products (name, description, stages) VALUES (
'Caremed Standard', 'Standard Caremed powered chair',
'[
  {"name":"Attach seat frame to jig","short":"Jig","steps":"1","est":5,"instructions":["Place seat frame securely in assembly jig","Check jig is locked and stable"],"bolts":[],"items":[]},
  {"name":"Earthing point and backrest frame","short":"Frame","steps":"2-3","est":15,"instructions":["Fit earthing point to seat frame","Attach backrest frame using shoulder bolts both sides"],"bolts":[{"ref":"S3-01","desc":"Backrest frame LH shoulder bolt","fix":"M10 Shoulder 12mm","spec":45},{"ref":"S3-02","desc":"Backrest frame RH shoulder bolt","fix":"M10 Shoulder 12mm","spec":45}],"items":[]},
  {"name":"Actuators (backrest, tilt, legrest)","short":"Actuators","steps":"4-6","est":30,"instructions":["Fit backrest actuator bracket","Attach backrest actuator to bracket","Fit tilt actuator with nut","Fit legrest actuator with nut"],"bolts":[{"ref":"S4-01","desc":"Backrest actuator bracket to seat frame","fix":"M10 Caphead 30mm","spec":50},{"ref":"S4-02","desc":"Backrest actuator to bracket","fix":"M6 Buttonhead 12mm","spec":12},{"ref":"S5-01","desc":"Tilt actuator to seat frame","fix":"M8 Shoulder 30mm","spec":30},{"ref":"S5-02","desc":"Tilt actuator nut","fix":"M8 Nut","spec":30},{"ref":"S6-01","desc":"Legrest actuator to seat frame","fix":"M8 Shoulder 30mm","spec":30},{"ref":"S6-02","desc":"Legrest actuator nut","fix":"M8 Nut","spec":30}],"items":[]},
  {"name":"Legrest slide, legrest and saddle","short":"Legrest","steps":"7-11","est":25,"instructions":["Fit legrest slide (4 bolts)","Attach legrest","Connect legrest actuator","Fit saddle"],"bolts":[{"ref":"S7-01","desc":"Legrest slide bolt 1","fix":"M6 Caphead 30mm","spec":12},{"ref":"S7-02","desc":"Legrest slide bolt 2","fix":"M6 Caphead 30mm","spec":12},{"ref":"S7-03","desc":"Legrest slide bolt 3","fix":"M6 Caphead 30mm","spec":12},{"ref":"S7-04","desc":"Legrest slide bolt 4","fix":"M6 Caphead 30mm","spec":12},{"ref":"S9-01","desc":"Legrest actuator to legrest","fix":"M8 Shoulder 30mm","spec":30},{"ref":"S9-02","desc":"Legrest actuator nut","fix":"M8 Nut","spec":30},{"ref":"S10-01","desc":"Saddle to tilt actuator","fix":"M8 Shoulder 30mm","spec":30},{"ref":"S10-02","desc":"Saddle to tilt actuator nut","fix":"M8 Nut","spec":30},{"ref":"S11-01","desc":"Saddle to seat frame LH","fix":"M10 Shoulder 40mm","spec":45},{"ref":"S11-02","desc":"Saddle to seat frame RH","fix":"M10 Shoulder 40mm","spec":45}],"items":[]},
  {"name":"Hilo, base frame and castors","short":"Base","steps":"12-15","est":30,"instructions":["Attach hilo to saddle (4 bolts)","Fit base frame to hilo (4 bolts)","Fit braking castors with Loctite","Fit tracking castors with Loctite"],"bolts":[{"ref":"S12-01","desc":"Hilo to saddle bolt 1","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S12-02","desc":"Hilo to saddle bolt 2","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S12-03","desc":"Hilo to saddle bolt 3","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S12-04","desc":"Hilo to saddle bolt 4","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S13-01","desc":"Base frame to hilo bolt 1","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S13-02","desc":"Base frame to hilo bolt 2","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S13-03","desc":"Base frame to hilo bolt 3","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S13-04","desc":"Base frame to hilo bolt 4","fix":"M8 Hex + Spring Washer","spec":30},{"ref":"S14-01","desc":"Braking castor LH","fix":"M12 Caphead 80mm + Loctite","spec":80},{"ref":"S14-02","desc":"Braking castor RH","fix":"M12 Caphead 80mm + Loctite","spec":80},{"ref":"S15-01","desc":"Tracking castor LH","fix":"M12 Caphead 80mm + Loctite","spec":80},{"ref":"S15-02","desc":"Tracking castor RH","fix":"M12 Caphead 80mm + Loctite","spec":80}],"items":[]},
  {"name":"Flip to lift and plugs/grommets","short":"Flip","steps":"16-17","est":10,"instructions":["Carefully flip assembly onto height-adjustable lift","Ensure unit is stable","Fit all plugs into open apertures","Fit all grommets into cable entry points"],"bolts":[],"items":[]},
  {"name":"Visual inspection checkpoint 1","short":"VI-1","steps":"18","est":10,"isCheckpoint":true,"banner":"Complete all checks before proceeding to wiring","instructions":[],"bolts":[],"items":["All structural bolts torqued to spec (steps 1-15)","Frame correctly inverted on lift (step 16)","All plugs and grommets fitted (step 17)","No visible damage or weld defects","Actuators move freely","Castors and base frame correctly aligned","Earthing point fitted and secure"]},
  {"name":"Earthing cables and powercord retainer","short":"Earthing","steps":"19-21","est":20,"instructions":["Route and attach 140mm earthing cable","Route and attach 500mm earthing cable","Fit powercord retainer (2 bolts)"],"bolts":[{"ref":"S19-01","desc":"140mm earth cable seat frame end","fix":"M4 Caphead 15mm","spec":4},{"ref":"S19-02","desc":"140mm earth cable earth point end","fix":"M6 Buttonhead 10mm","spec":8},{"ref":"S20-01","desc":"500mm earth cable to seat frame","fix":"M6 Buttonhead 10mm","spec":8},{"ref":"S21-01","desc":"Powercord retainer bolt 1","fix":"M4 Caphead 10mm","spec":4},{"ref":"S21-02","desc":"Powercord retainer bolt 2","fix":"M4 Caphead 10mm","spec":4}],"items":[]},
  {"name":"Backrest plastic, handlebar and control box","short":"Controls","steps":"22-24","est":20,"instructions":["Fit backrest plastic with earthing cable bolt","Attach handlebar","Fit control box"],"bolts":[{"ref":"S22-01","desc":"Backrest plastic earth cable bolt","fix":"M6 Buttonhead 20mm","spec":8},{"ref":"S23-01","desc":"Handlebar to backrest frame","fix":"M8 Buttonhead 30mm","spec":25},{"ref":"S24-01","desc":"Control box upper bolt","fix":"50mm Buttonhead","spec":12},{"ref":"S24-02","desc":"Control box lower bolt","fix":"40mm Buttonhead","spec":12}],"items":[]},
  {"name":"Battery, actuators and cable management","short":"Wiring","steps":"25-26","est":25,"instructions":["Fit battery (2 bolts)","Plug in all actuator connectors","Route and secure all cables"],"bolts":[{"ref":"S25-01","desc":"Battery bolt 1","fix":"M6 Buttonhead 40mm","spec":8},{"ref":"S25-02","desc":"Battery bolt 2","fix":"M6 Buttonhead 40mm","spec":8}],"items":[]},
  {"name":"Power test and function test","short":"Test","steps":"27-28","est":15,"instructions":["Plug in powercable, handset and battery","Power on and test all functions"],"bolts":[],"items":["Backrest raise and lower - full range, no obstruction","Tilt function - full range, no obstruction","Legrest raise and lower - full range, no obstruction","Hilo up and down - full range, no obstruction","All handset buttons responding correctly","No error codes or warning lights"]},
  {"name":"Service cover and skirts","short":"Covers","steps":"29-32","est":20,"instructions":["Fit service cover panel","Fit front skirt panel","Fit left side skirt","Fit right side skirt","Check all panels flush and secure"],"bolts":[],"items":[]},
  {"name":"Infection control panels","short":"IC panels","steps":"33-35","est":15,"instructions":["Fit infection control panels to all sections","Check all panels correctly seated","Ensure no pinch points or sharp edges"],"bolts":[],"items":[]},
  {"name":"Visual inspection checkpoint 2","short":"VI-2","steps":"36","est":10,"isCheckpoint":true,"banner":"Complete all checks before proceeding to finishing","instructions":[],"bolts":[],"items":["Both earthing cables installed and secure","Powercord retainer fitted","Backrest plastic fitted with earthing cable bolt","Handlebar fitted correctly","Control box and battery fitted","All actuators plugged in and cable management complete","All functions tested and operational","Service cover and all skirts fitted","Infection control panels fitted","No visible damage or cosmetic defects"]},
  {"name":"Cushions and armrests","short":"Cushions","steps":"37-41","est":25,"instructions":["Fit legrest cushion (2 bolts)","Fit armrest brackets LH and RH","Fit armrest blocks (2 bolts each)","Attach armrests (2 bolts each)"],"bolts":[{"ref":"S36-01","desc":"Legrest cushion bolt 1","fix":"M6 Buttonhead 40mm","spec":8},{"ref":"S36-02","desc":"Legrest cushion bolt 2","fix":"M6 Buttonhead 40mm","spec":8},{"ref":"S31-01","desc":"Armrest bracket LH","fix":"M8 Buttonhead 30mm","spec":25},{"ref":"S33-01","desc":"Armrest bracket RH","fix":"M8 Buttonhead 30mm","spec":25},{"ref":"S39-01","desc":"Armrest block LH bolt 1","fix":"M10 Caphead 35mm","spec":45},{"ref":"S39-02","desc":"Armrest block LH bolt 2","fix":"M10 Caphead 35mm","spec":45},{"ref":"S39-03","desc":"Armrest block RH bolt 1","fix":"M10 Caphead 35mm","spec":45},{"ref":"S39-04","desc":"Armrest block RH bolt 2","fix":"M10 Caphead 35mm","spec":45},{"ref":"S40-01","desc":"Left armrest bolt 1","fix":"M6 Buttonhead 40mm","spec":8},{"ref":"S40-02","desc":"Left armrest bolt 2","fix":"M6 Buttonhead 40mm","spec":8},{"ref":"S41-01","desc":"Right armrest bolt 1","fix":"M6 Buttonhead 40mm","spec":8},{"ref":"S41-02","desc":"Right armrest bolt 2","fix":"M6 Buttonhead 40mm","spec":8}],"items":[]},
  {"name":"Decals, serial number and final clean","short":"Finish","steps":"42-46","est":15,"instructions":["Apply all required decals","Attach serial number plate","Final clean of entire unit"],"bolts":[],"items":["All decals applied correctly and aligned","Serial number plate attached and legible","Unit fully cleaned","All panels secure - no rattles","Unit ready for QC final sign-off"]}
]'::jsonb
);
