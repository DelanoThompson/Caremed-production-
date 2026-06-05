(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // lib/db.js
  var db_exports = {};
  __export(db_exports, {
    Auth: () => Auth,
    Jobs: () => Jobs,
    Products: () => Products,
    Profiles: () => Profiles,
    QCRecords: () => QCRecords,
    StageLogs: () => StageLogs,
    Transfers: () => Transfers,
    getClient: () => getClient,
    subscribeToJobs: () => subscribeToJobs
  });
  function getClient() {
    if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // No-op lock — bypasses navigator.locks, which deadlocks in Android
        // WebView/PWA on reopen and causes the app to spin forever.
        lock: async (_name, _acquireTimeout, fn) => await fn()
      }
    });
    return _client;
  }
  function subscribeToJobs(cb) {
    return getClient().channel("jobs-rt").on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, cb).on("postgres_changes", { event: "*", schema: "public", table: "stage_logs" }, cb).on("postgres_changes", { event: "*", schema: "public", table: "transfer_requests" }, cb).subscribe();
  }
  var createClient, SUPABASE_URL, SUPABASE_KEY, _client, Auth, Profiles, Products, Jobs, StageLogs, QCRecords, Transfers;
  var init_db = __esm({
    "lib/db.js"() {
      ({ createClient } = window.supabase);
      SUPABASE_URL = "https://zxlvxfquzdzfukuosyky.supabase.co";
      SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bHZ4ZnF1emR6ZnVrdW9zeWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjAzNzcsImV4cCI6MjA5NTYzNjM3N30.7k2BU8HbKPubUoWYwksPdryxUoGeDtmQO6x4KRX-Zo8";
      window.__SB_URL__ = SUPABASE_URL;
      window.__SB_KEY__ = SUPABASE_KEY;
      _client = null;
      Auth = {
        async signIn(username, password) {
          if (username.includes("@")) {
            const { data, error } = await getClient().auth.signInWithPassword({ email: username, password });
            if (!error) return data;
          }
          const internal = `${username.split("@")[0]}@caremed.internal`;
          const { data: d1, error: e1 } = await getClient().auth.signInWithPassword({ email: internal, password });
          if (!e1) return d1;
          const { data: d2, error: e2 } = await getClient().auth.signInWithPassword({ email: username, password });
          if (!e2) return d2;
          throw e1;
        },
        async signOut() {
          await getClient().auth.signOut();
        },
        async getSession() {
          const { data } = await getClient().auth.getSession();
          return data.session;
        },
        async getUser() {
          const { data } = await getClient().auth.getUser();
          return data.user;
        },
        onAuthChange(cb) {
          return getClient().auth.onAuthStateChange(cb);
        }
      };
      Profiles = {
        async get(userId) {
          const { data, error } = await getClient().from("profiles").select("*").eq("id", userId).single();
          if (error) throw error;
          return data;
        },
        async getAll() {
          const { data, error } = await getClient().from("profiles").select("*").order("display_name");
          if (error) throw error;
          return data || [];
        },
        async update(userId, updates) {
          const { data, error } = await getClient().from("profiles").update(updates).eq("id", userId).select().single();
          if (error) throw error;
          return data;
        },
        async upsert(profile) {
          const { data, error } = await getClient().from("profiles").upsert(profile).select().single();
          if (error) throw error;
          return data;
        }
      };
      Products = {
        async getAll() {
          const { data, error } = await getClient().from("products").select("*").eq("active", true).order("name");
          if (error) throw error;
          return data || [];
        },
        async get(id) {
          const { data, error } = await getClient().from("products").select("*").eq("id", id).single();
          if (error) throw error;
          return data;
        },
        async save(product) {
          if (product.id) {
            const { data, error } = await getClient().from("products").update(product).eq("id", product.id).select().single();
            if (error) throw error;
            return data;
          } else {
            const { data, error } = await getClient().from("products").insert(product).select().single();
            if (error) throw error;
            return data;
          }
        },
        async deactivate(id) {
          await getClient().from("products").update({ active: false }).eq("id", id);
        }
      };
      Jobs = {
        async getAll(filters = {}) {
          let q = getClient().from("jobs").select("*, product:products(name,stages)").order("scheduled_date");
          if (filters.date) q = q.eq("scheduled_date", filters.date);
          if (filters.status) q = q.eq("status", filters.status);
          if (filters.operatorId) q = q.eq("operator_id", filters.operatorId);
          if (filters.from) q = q.gte("scheduled_date", filters.from);
          if (filters.to) q = q.lte("scheduled_date", filters.to);
          const { data, error } = await q;
          if (error) throw error;
          return data || [];
        },
        async get(id) {
          const { data, error } = await getClient().from("jobs").select("*, product:products(*)").eq("id", id).single();
          if (error) throw error;
          return data;
        },
        async create(job) {
          const { data, error } = await getClient().from("jobs").insert(job).select().single();
          if (error) throw error;
          return data;
        },
        async update(id, updates) {
          const { data, error } = await getClient().from("jobs").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
          if (error) throw error;
          return data;
        },
        async getTodayStats() {
          const today2 = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const { data: todayJobs } = await getClient().from("jobs").select("status").eq("scheduled_date", today2);
          const { data: inProg } = await getClient().from("jobs").select("id").eq("status", "in_progress");
          const { data: done } = await getClient().from("jobs").select("id").eq("status", "complete").gte("updated_at", today2);
          return {
            scheduled: (todayJobs || []).length,
            inProgress: (inProg || []).length,
            complete: (done || []).length,
            onHold: (todayJobs || []).filter((j) => j.status === "hold").length
          };
        }
      };
      StageLogs = {
        async getForJob(jobId) {
          const { data, error } = await getClient().from("stage_logs").select("*").eq("job_id", jobId).order("started_at");
          if (error) throw error;
          return data || [];
        },
        async upsert(log) {
          const { data, error } = await getClient().from("stage_logs").upsert(log, { onConflict: "job_id,stage_id" }).select().single();
          if (error) throw error;
          return data;
        }
      };
      QCRecords = {
        async getForJob(jobId, formType) {
          let q = getClient().from("qc_records").select("*").eq("job_id", jobId);
          if (formType) q = q.eq("form_type", formType);
          const { data, error } = await q;
          if (error) throw error;
          return data || [];
        },
        async search(term) {
          const { data, error } = await getClient().from("qc_records").select("*").or(`work_order.ilike.%${term}%,serial.ilike.%${term}%,operator_name.ilike.%${term}%`).order("updated_at", { ascending: false }).limit(50);
          if (error) throw error;
          return data || [];
        },
        async getAll() {
          const { data, error } = await getClient().from("qc_records").select("*").order("updated_at", { ascending: false }).limit(50);
          if (error) throw error;
          return data || [];
        },
        async save(record) {
          if (record.id) {
            const { data, error } = await getClient().from("qc_records").update({ ...record, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", record.id).select().single();
            if (error) throw error;
            return data;
          } else {
            const { data, error } = await getClient().from("qc_records").insert(record).select().single();
            if (error) throw error;
            return data;
          }
        }
      };
      Transfers = {
        async getAll() {
          const { data, error } = await getClient().from("transfer_requests").select("*, job:jobs(work_order,model,serial)").eq("status", "pending").order("created_at");
          if (error) throw error;
          return data || [];
        },
        async create(req) {
          const { data, error } = await getClient().from("transfer_requests").insert(req).select().single();
          if (error) throw error;
          return data;
        },
        async respond(id, status, supervisorId) {
          const { data, error } = await getClient().from("transfer_requests").update({ status, responded_by: supervisorId, responded_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
          if (error) throw error;
          return data;
        }
      };
    }
  });

  // lib/state.js
  var State;
  var init_state = __esm({
    "lib/state.js"() {
      init_db();
      State = {
        user: null,
        profile: null,
        currentTab: "dashboard",
        realtimeSub: null,
        get isSupervisor() {
          var _a;
          return ((_a = this.profile) == null ? void 0 : _a.role) === "supervisor";
        },
        get displayName() {
          var _a, _b;
          return ((_a = this.profile) == null ? void 0 : _a.display_name) || ((_b = this.user) == null ? void 0 : _b.email) || "\u2014";
        },
        async loadProfile() {
          if (!this.user) return;
          try {
            this.profile = await Profiles.get(this.user.id);
          } catch (e) {
            const meta = this.user.user_metadata || {};
            this.profile = await Profiles.upsert({
              id: this.user.id,
              email: this.user.email,
              display_name: meta.display_name || meta.username || this.user.email.split("@")[0],
              role: meta.role || "operator",
              active: true
            });
          }
        },
        setupRealtime(onUpdate) {
          if (this.realtimeSub) this.realtimeSub.unsubscribe();
          this.realtimeSub = subscribeToJobs(onUpdate);
        }
      };
    }
  });

  // lib/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    closeModal: () => closeModal,
    fmtDate: () => fmtDate,
    fmtDateShort: () => fmtDateShort,
    fmtDuration: () => fmtDuration,
    fmtTime: () => fmtTime,
    initials: () => initials,
    modal: () => modal,
    pillClass: () => pillClass,
    statusColor: () => statusColor,
    statusLabel: () => statusLabel,
    toast: () => toast,
    today: () => today
  });
  function fmtTime(ms) {
    if (!ms && ms !== 0) return "\u2014";
    const s = Math.floor(ms / 1e3);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }
  function fmtDuration(startIso, endIso) {
    if (!startIso) return "\u2014";
    const end = endIso ? new Date(endIso) : /* @__PURE__ */ new Date();
    return fmtTime(end - new Date(startIso));
  }
  function pillClass(s) {
    return { scheduled: "pill-scheduled", in_progress: "pill-inprogress", complete: "pill-complete", hold: "pill-hold" }[s] || "pill-scheduled";
  }
  function statusLabel(s, t10) {
    return { scheduled: t10("scheduled"), in_progress: t10("inProgressBadge"), complete: t10("complete"), hold: t10("hold") }[s] || s;
  }
  function statusColor(s) {
    return { scheduled: "#3a3a7f", in_progress: "#c08000", complete: "#1f6b3a", hold: "#c02020" }[s] || "#888";
  }
  function today() {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  function fmtDate(iso) {
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtDateShort(iso) {
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function toast(msg) {
    const container = document.getElementById("toast-container");
    if (!container) {
      console.log("Toast:", msg);
      return;
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 350);
    }, 2800);
  }
  function modal(content, onClose) {
    const container = document.getElementById("modal-container");
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `<div class="modal-card">${content}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        onClose && onClose();
      }
    });
    container.appendChild(overlay);
    return overlay;
  }
  function closeModal() {
    document.querySelectorAll("#modal-container .modal-overlay.open").forEach((m) => m.remove());
  }
  function initials(name) {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }
  var _toastTimer;
  var init_utils = __esm({
    "lib/utils.js"() {
      _toastTimer = null;
    }
  });

  // i18n/index.js
  var en, i18n;
  var init_i18n = __esm({
    "i18n/index.js"() {
      en = {
        appName: "Production",
        offline: "\u26A0 Offline \u2014 changes will sync when reconnected",
        // Nav
        dashboard: "Dashboard",
        scheduler: "Scheduler",
        builds: "Builds",
        records: "Records",
        admin: "Admin",
        // Roles
        operator: "Operator",
        supervisor: "Supervisor",
        // Login
        loginSub: "Sign in to your production account",
        username: "Username",
        password: "Password",
        signIn: "Sign in",
        invalidCredentials: "Incorrect username or password",
        // Dashboard
        scheduledToday: "Scheduled today",
        inProgress: "In progress",
        completedToday: "Completed today",
        onHold: "On hold",
        liveBuilds: "Live builds",
        todaySchedule: "Today's schedule",
        noActiveBuilds: "No active builds",
        noJobsToday: "No jobs scheduled today",
        noSerial: "\u2014",
        transferRequest: "Transfer request",
        approve: "Approve",
        decline: "Decline",
        // Status labels / badges
        scheduled: "Scheduled",
        inProgressBadge: "In progress",
        complete: "Complete",
        hold: "On hold",
        // Builds
        activeBuilds: "Active builds",
        completedToday2: "Completed today",
        noBuilds: "No builds",
        requestTransfer: "Request transfer",
        errorSaving: "Error saving: ",
        errorLoading: "Error loading: ",
        transferRequested: "Transfer requested",
        workOrder: "Work order",
        model: "Model",
        serialNo: "Serial no.",
        assignedOperator: "Assigned operator",
        scheduledDate: "Scheduled date",
        qcForms: "QC forms",
        continueStepByStep: "Continue step-by-step",
        assemblyQC: "Assembly QC",
        preDelivery: "Pre-delivery inspection",
        goodsIn: "Goods in inspection",
        repairRework: "Repair / Rework",
        assemblyQCSub: "Torque checks, visual inspection, sign-off",
        comingSoon: "Coming soon",
        pending: "Pending",
        // Records
        qcRecords: "QC records",
        searchRecords: "Search by serial, work order, operator...",
        noRecords: "No QC records yet",
        submitted: "Submitted",
        // Admin
        users: "Users",
        products: "Products",
        inviteUser: "Invite user",
        email: "Email",
        displayName: "Display name",
        role: "Role",
        cancel: "Cancel",
        sendInvite: "Send invite",
        fillRequired: "Please fill in all required fields",
        inviteSent: "Invite sent \u2014 user can now set their password",
        reactivate: "Reactivate",
        deactivate: "Deactivate",
        // Settings
        settings: "Settings",
        close: "Close",
        signOut: "Sign out"
      };
      i18n = {
        t(key) {
          return en[key] ?? key;
        }
      };
    }
  });

  // pages/Slideshow.js
  var Slideshow_exports = {};
  __export(Slideshow_exports, {
    openSlideshow: () => openSlideshow
  });
  function openSlideshow(job) {
    var _a;
    const screen = document.getElementById("slideshow-screen");
    screen.innerHTML = "";
    AppShell.openScreen("slideshow-screen");
    const stages = ((_a = job.product) == null ? void 0 : _a.stages) || [];
    const completed = [...job.stages_completed || []];
    let current = job.current_stage ?? completed.length;
    if (current >= stages.length) current = stages.length - 1;
    const torqueData = {};
    const checkData = {};
    let stageStart = Date.now();
    let timerHandle = null;
    function canAdvance() {
      const stage = stages[current];
      if (!stage) return false;
      if (completed.includes(current)) return true;
      const bolts = stage.bolts || [];
      const items = stage.items || [];
      if (bolts.length === 0 && items.length === 0) return true;
      const td = torqueData[current] || {};
      const cd = checkData[current] || {};
      const boltsOk = bolts.every((b) => td[b.ref] !== void 0 && td[b.ref] !== "" && +td[b.ref] > 0);
      const itemsOk = items.every((_, i) => cd[i]);
      return boltsOk && itemsOk;
    }
    function updateNextBtn() {
      const btn = document.getElementById("ss-next-btn");
      if (!btn) return;
      const ready = canAdvance();
      btn.removeAttribute("disabled");
      if (ready) {
        btn.classList.add("ready");
        btn.classList.remove("ss-not-ready");
      } else {
        btn.classList.remove("ready");
        btn.classList.add("ss-not-ready");
      }
    }
    function render() {
      const stage = stages[current];
      if (!stage) return;
      const isDone = completed.includes(current);
      const isLast = current === stages.length - 1;
      const pct = Math.round(completed.length / stages.length * 100);
      const bolts = stage.bolts || [];
      const items = stage.items || [];
      const instrs = stage.instructions || [];
      const isCheck = !!stage.isCheckpoint;
      torqueData[current] = torqueData[current] || {};
      checkData[current] = checkData[current] || {};
      const td = torqueData[current];
      const cd = checkData[current];
      screen.innerHTML = `
      <div class="ss-topbar">
        <button class="ss-back" onclick="window._ssClose()">\u2039</button>
        <div class="ss-job-info">
          <div class="ss-job-title">${job.work_order} \u2014 ${job.model || ""}</div>
          <div class="ss-job-sub">SN: ${job.serial || "\u2014"} \xB7 ${job.operator_name || "\u2014"}</div>
        </div>
        <span class="ss-count">${completed.length}/${stages.length}</span>
      </div>
      <div class="ss-prog-track"><div class="ss-prog-fill" style="width:${pct}%"></div></div>

      <div class="ss-slide-wrap" id="ss-slide">
        <div class="ss-stage-header ${isCheck ? "checkpoint" : isDone ? "done" : ""}">
          <div class="ss-stage-badge">Stage ${current + 1} of ${stages.length}${isCheck ? " \xB7 Checkpoint" : ""}</div>
          <div class="ss-stage-name">${stage.name}</div>
          <div class="ss-stage-steps">Steps ${stage.steps || ""}${stage.est ? ` \xB7 Est. ${stage.est} min` : ""}</div>
        </div>

        ${isCheck && stage.banner ? `<div class="insp-banner">\u26A0 ${stage.banner}</div>` : ""}

        ${instrs.length ? `
        <div class="ss-sec-title">Instructions</div>
        <div class="ss-instructions">
          ${instrs.map((ins, i) => `<div class="ss-inst-row">
            <div class="ss-inst-num">${i + 1}</div>
            <div class="ss-inst-text">${ins}</div>
          </div>`).join("")}
        </div>` : ""}

        ${bolts.length ? `
        <div class="ss-sec-title">Torque checks \u2014 fill all values to unlock next stage</div>
        <div class="ss-bolt-list">
          ${bolts.map((b, bi) => {
        const val = td[b.ref] || "";
        const ok = val && +val >= b.spec * 0.9 && +val <= b.spec * 1.1;
        const fail = val && !ok;
        return `<div class="ss-bolt-row">
              <div class="ss-bolt-info">
                <div class="ss-bolt-ref">${b.ref}</div>
                <div class="ss-bolt-desc">${b.desc}</div>
                <div class="ss-bolt-fix">${b.fix}</div>
              </div>
              <div class="ss-bolt-right">
                <div class="ss-bolt-spec">Spec: ${b.spec} Nm</div>
                <input class="ss-t-in ${ok ? "pass" : fail ? "fail" : ""}" type="number" id="t-${bi}"
                  inputmode="decimal" placeholder="${b.spec}" value="${val}"
                  min="0" max="999" step="0.1"
                  oninput="window._ssTorque('${b.ref}',${bi},${b.spec},this.value)">
                <div class="ss-result-dot ${ok ? "dot-pass" : fail ? "dot-fail" : ""}" id="rd-${bi}">
                  ${ok ? "\u2713" : fail ? "\u2717" : ""}
                </div>
              </div>
            </div>`;
      }).join("")}
        </div>` : ""}

        ${items.length ? `
        <div class="ss-sec-title">Visual checks \u2014 tick all items to unlock next stage</div>
        <div class="ss-check-list">
          ${items.map((item, ii) => `<div class="ss-chk-item ${cd[ii] ? "checked" : ""}" onclick="window._ssCheck(${ii})">
            <input type="checkbox" id="chk-${ii}" ${cd[ii] ? "checked" : ""} onchange="window._ssCheck(${ii})">
            <label for="chk-${ii}">${item}</label>
          </div>`).join("")}
        </div>` : ""}

        ${isDone ? `<div class="ss-done-banner">\u2713 Stage complete</div>` : ""}
      </div>

      <div class="ss-footer">
        <div class="ss-timer" id="ss-timer">0:00</div>
        <button class="ss-next-btn" id="ss-next-btn" onclick="window._ssNext()">
          ${isDone ? isLast ? "All done \u2713" : "Next stage \u2192" : isLast ? "Complete build" : "Mark complete & next \u2192"}
        </button>
      </div>`;
      startTimer();
      updateNextBtn();
    }
    function startTimer() {
      clearInterval(timerHandle);
      stageStart = Date.now();
      timerHandle = setInterval(() => {
        const el = document.getElementById("ss-timer");
        if (!el) {
          clearInterval(timerHandle);
          return;
        }
        const s = Math.floor((Date.now() - stageStart) / 1e3);
        el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      }, 1e3);
    }
    window._ssTorque = (ref, bi, spec, val) => {
      torqueData[current][ref] = val;
      const dot = document.getElementById(`rd-${bi}`);
      const inp = document.getElementById(`t-${bi}`);
      if (val) {
        const n = +val;
        const ok = n >= spec * 0.9 && n <= spec * 1.1;
        if (dot) {
          dot.className = `ss-result-dot ${ok ? "dot-pass" : "dot-fail"}`;
          dot.textContent = ok ? "\u2713" : "\u2717";
        }
        if (inp) {
          inp.classList.toggle("pass", ok);
          inp.classList.toggle("fail", !ok);
        }
      } else {
        if (dot) {
          dot.className = "ss-result-dot";
          dot.textContent = "";
        }
        if (inp) {
          inp.classList.remove("pass", "fail");
        }
      }
      updateNextBtn();
    };
    window._ssCheck = (ii) => {
      checkData[current][ii] = !checkData[current][ii];
      const chk = document.getElementById(`chk-${ii}`);
      const item = chk == null ? void 0 : chk.closest(".ss-chk-item");
      if (chk) chk.checked = checkData[current][ii];
      if (item) item.classList.toggle("checked", checkData[current][ii]);
      updateNextBtn();
    };
    window._ssNext = async () => {
      if (!canAdvance()) {
        const stage = stages[current];
        const bolts = (stage == null ? void 0 : stage.bolts) || [];
        const items = (stage == null ? void 0 : stage.items) || [];
        const td = torqueData[current] || {};
        const cd = checkData[current] || {};
        const missingBolts = bolts.filter((b) => !td[b.ref] || +td[b.ref] <= 0);
        const missingItems = items.filter((_, i) => !cd[i]);
        let msg = "Please complete all checks first:\n";
        if (missingBolts.length) msg += `
\u2022 ${missingBolts.length} torque value(s) missing`;
        if (missingItems.length) msg += `
\u2022 ${missingItems.length} visual check(s) not ticked`;
        toast(msg);
        return;
      }
      clearInterval(timerHandle);
      const elapsed = Math.round((Date.now() - stageStart) / 1e3);
      if (!completed.includes(current)) completed.push(current);
      const updates = { stages_completed: completed, current_stage: current + 1 };
      if (current === stages.length - 1) updates.status = "complete";
      else updates.status = "in_progress";
      try {
        await StageLogs.upsert({
          job_id: job.id,
          stage_id: current,
          operator: State.displayName,
          started_at: new Date(Date.now() - elapsed * 1e3).toISOString(),
          ended_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        await Jobs.update(job.id, updates);
      } catch (e) {
        console.error(e);
      }
      if (current >= stages.length - 1) {
        toast("Build complete! \u{1F389}");
        AppShell.closeScreen("slideshow-screen");
        return;
      }
      current++;
      render();
    };
    window._ssClose = () => {
      clearInterval(timerHandle);
      AppShell.closeScreen("slideshow-screen");
    };
    render();
  }
  var init_Slideshow = __esm({
    "pages/Slideshow.js"() {
      init_db();
      init_state();
      init_utils();
    }
  });

  // pages/QCForm.js
  var QCForm_exports = {};
  __export(QCForm_exports, {
    openQCForm: () => openQCForm
  });
  async function openQCForm(type, jobId) {
    var _a;
    if (type !== "assembly") {
      toast(t2("comingSoon"));
      return;
    }
    const screen = document.getElementById("form-screen");
    AppShell.openScreen("form-screen");
    screen.innerHTML = `<div class="topbar"><div class="topbar-inner">
    <button class="back-btn" onclick="AppShell.closeScreen('form-screen')">\u2039</button>
    <div><div class="topbar-title">${t2("assemblyQC")}</div><div class="topbar-sub" id="qcf-sub">Loading...</div></div>
  </div></div>
  <div id="qcf-body" style="padding-bottom:80px"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>
  <div class="footer-bar">
    <button class="footer-btn" onclick="window._qcExport()">\u2193 Export</button>
    <button class="footer-btn primary" id="qcf-submit" onclick="window._qcSubmit()">Submit QC</button>
  </div>`;
    try {
      const [job, existing] = await Promise.all([
        Jobs.get(jobId),
        QCRecords.getForJob(jobId, "assembly").then((r) => r[0] || null)
      ]);
      document.getElementById("qcf-sub").textContent = `${job.work_order} \xB7 SN: ${job.serial || "\u2014"}`;
      const data = (existing == null ? void 0 : existing.data) || {};
      const stages = ((_a = job.product) == null ? void 0 : _a.stages) || [];
      const allBolts = stages.flatMap(
        (s, si) => (s.bolts || []).map((b) => ({ ...b, stageName: s.name, stageIdx: si }))
      );
      const body = document.getElementById("qcf-body");
      body.innerHTML = `
      <div class="page-pad">
        <div class="form-section">
          <div class="form-sec-head" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="form-sec-icon">\u{1F4CB}</div>
            <div><div class="form-sec-title">Job details</div></div>
            <span class="chevron">\u203A</span>
          </div>
          <div class="form-sec-body">
            <div class="card-pad">
              <div class="card-row"><span class="card-key">${t2("workOrder")}</span><span class="card-val">${job.work_order}</span></div>
              <div class="card-row"><span class="card-key">${t2("model")}</span><span class="card-val">${job.model || "\u2014"}</span></div>
              <div class="card-row"><span class="card-key">${t2("serialNo")}</span><span class="card-val">${job.serial || "\u2014"}</span></div>
              <div class="card-row"><span class="card-key">${t2("assignedOperator")}</span><span class="card-val">${job.operator_name || "\u2014"}</span></div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-sec-head" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="form-sec-icon">\u{1F529}</div>
            <div>
              <div class="form-sec-title">Torque verification</div>
              <div class="form-sec-sub">${allBolts.length} bolt locations</div>
            </div>
            <span class="chevron">\u203A</span>
          </div>
          <div class="form-sec-body">
            ${allBolts.map((b, i) => {
        var _a2;
        const saved = (_a2 = data.torque) == null ? void 0 : _a2[b.ref];
        const ok = saved && +saved >= b.spec * 0.9 && +saved <= b.spec * 1.1;
        return `<div class="bolt-row">
                <div>
                  <div class="bolt-ref">${b.ref} \xB7 ${b.stageName}</div>
                  <div class="bolt-desc">${b.desc}</div>
                  <div class="bolt-fix">${b.fix}</div>
                </div>
                <div class="bolt-right">
                  <div class="bolt-spec">Spec: ${b.spec} Nm</div>
                  <input class="t-in ${saved ? ok ? "pass" : "fail" : ""}" type="number" id="qbt-${i}"
                    value="${saved || ""}" placeholder="${b.spec}" min="0" max="999"
                    oninput="window._qcTorque('${b.ref}',${i},${b.spec},this.value)" data-ref="${b.ref}">
                  <div class="result-dot ${saved ? ok ? "dot-pass" : "dot-fail" : ""}" id="qrd-${i}">${saved ? ok ? "\u2713" : "\u2717" : ""}</div>
                </div>
              </div>`;
      }).join("")}

            <div class="signoff-area" id="torque-signoff">
              ${data.torqueSigned ? `<div class="signed-info">\u2713 Signed: ${data.torqueSigned} \xB7 ${data.torqueSignedAt}</div>` : `<input id="sig-torque" type="text" placeholder="Operator name" style="flex:1;min-width:120px;max-width:180px;font-size:13px;font-family:var(--sans);padding:7px 10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
                   <button class="sign-btn" onclick="window._qcSign('torque')">Sign off</button>`}
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-sec-head" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="form-sec-icon green">\u{1F441}</div>
            <div>
              <div class="form-sec-title">Visual inspection</div>
              <div class="form-sec-sub">Final quality checks</div>
            </div>
            <span class="chevron">\u203A</span>
          </div>
          <div class="form-sec-body">
            <div class="insp-banner">Check each item carefully before signing off</div>
            <div class="check-list" style="padding:10px 14px">
              ${[
        "All structural bolts torqued to specification",
        "No visible damage, scratches or cosmetic defects",
        "All panels flush and secure \u2014 no rattles",
        "All actuators move freely through full range",
        "Castors and base frame correctly aligned",
        "All wiring routed and secured \u2014 no pinch points",
        "All handset buttons responding correctly",
        "No error codes or warning lights on power-on",
        "All decals applied correctly and legible",
        "Serial number plate attached and correct",
        "Unit fully cleaned"
      ].map((item, i) => {
        var _a2;
        const checked = (_a2 = data.visual) == null ? void 0 : _a2[i];
        return `<div class="chk-item ${checked ? "checked" : ""}" onclick="window._qcVisual(${i})">
                  <input type="checkbox" id="vi-${i}" ${checked ? "checked" : ""}>
                  <label class="chk-label" for="vi-${i}">${item}</label>
                </div>`;
      }).join("")}
            </div>
            <div class="signoff-area">
              ${data.visualSigned ? `<div class="signed-info">\u2713 Signed: ${data.visualSigned} \xB7 ${data.visualSignedAt}</div>` : `<input id="sig-visual" type="text" placeholder="Inspector name" style="flex:1;min-width:120px;max-width:180px;font-size:13px;font-family:var(--sans);padding:7px 10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
                   <button class="sign-btn" onclick="window._qcSign('visual')">Sign off</button>`}
            </div>
          </div>
        </div>

        <div class="notes-wrap">
          <span class="notes-lbl">Notes / non-conformances</span>
          <textarea id="qcf-notes" rows="3" placeholder="Any issues found...">${data.notes || ""}</textarea>
        </div>
      </div>`;
      const formData = JSON.parse(JSON.stringify(data));
      formData.torque = formData.torque || {};
      formData.visual = formData.visual || {};
      window._qcTorque = (ref, i, spec, val) => {
        formData.torque[ref] = val;
        const ok = val && +val >= spec * 0.9 && +val <= spec * 1.1;
        const inp = document.getElementById(`qbt-${i}`);
        const dot = document.getElementById(`qrd-${i}`);
        if (inp) {
          inp.classList.toggle("pass", !!(val && ok));
          inp.classList.toggle("fail", !!(val && !ok));
        }
        if (dot) {
          dot.className = `result-dot ${val ? ok ? "dot-pass" : "dot-fail" : ""}`;
          dot.textContent = val ? ok ? "\u2713" : "\u2717" : "";
        }
      };
      window._qcVisual = (i) => {
        formData.visual[i] = !formData.visual[i];
        const chk = document.getElementById(`vi-${i}`);
        const item = chk == null ? void 0 : chk.closest(".chk-item");
        if (chk) chk.checked = formData.visual[i];
        if (item) item.classList.toggle("checked", formData.visual[i]);
      };
      window._qcSign = (section) => {
        const inp = document.getElementById(`sig-${section}`);
        if (!(inp == null ? void 0 : inp.value.trim())) {
          toast("Enter a name to sign off");
          return;
        }
        const name = inp.value.trim();
        const ts = (/* @__PURE__ */ new Date()).toLocaleString("en-GB");
        formData[`${section}Signed`] = name;
        formData[`${section}SignedAt`] = ts;
        const area = inp.closest(".signoff-area");
        if (area) area.innerHTML = `<div class="signed-info">\u2713 Signed: ${name} \xB7 ${ts}</div>`;
        toast(`${section === "torque" ? "Torque" : "Visual"} signed off`);
      };
      window._qcExport = () => toast("Export coming soon");
      window._qcSubmit = async () => {
        var _a2;
        formData.notes = ((_a2 = document.getElementById("qcf-notes")) == null ? void 0 : _a2.value) || "";
        const record = {
          ...existing || {},
          job_id: jobId,
          form_type: "assembly",
          work_order: job.work_order,
          serial: job.serial,
          operator_name: job.operator_name,
          data: formData
        };
        try {
          await QCRecords.save(record);
          const qcRecords = { ...job.qc_records || {}, assembly: true };
          await Jobs.update(jobId, { qc_records: qcRecords });
          toast("QC form saved \u2713");
          AppShell.closeScreen("form-screen");
        } catch (e) {
          toast("Error saving: " + e.message);
        }
      };
    } catch (e) {
      document.getElementById("qcf-body").innerHTML = `<div class="empty-state">Error loading form: ${e.message}</div>`;
    }
  }
  var t2;
  var init_QCForm = __esm({
    "pages/QCForm.js"() {
      init_db();
      init_state();
      init_utils();
      init_i18n();
      t2 = (k) => i18n.t(k);
    }
  });

  // pages/Builds.js
  var Builds_exports = {};
  __export(Builds_exports, {
    openBuildDetail: () => openBuildDetail,
    renderBuilds: () => renderBuilds
  });
  async function renderBuilds() {
    const el = document.getElementById("tab-builds");
    if (!el) return;
    el.innerHTML = `<div class="page-pad">
    <div class="section-title">${t3("activeBuilds")}</div>
    <div id="builds-active"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>
    <div class="section-title mt">${t3("completedToday2")}</div>
    <div id="builds-done"></div>
  </div>`;
    try {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const [active, doneRes] = await Promise.all([
        Jobs.getAll({ status: "in_progress" }),
        getClient().from("jobs").select("*, product:products(name,stages)").eq("status", "complete").gte("updated_at", todayStr).order("updated_at", { ascending: false }).then((r) => r.data || [])
      ]);
      const canAccess = (j) => {
        var _a;
        return State.isSupervisor || j.operator_id === ((_a = State.user) == null ? void 0 : _a.id);
      };
      const activeEl = document.getElementById("builds-active");
      if (!active.length) activeEl.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F529}</div>${t3("noBuilds")}</div>`;
      else {
        activeEl.innerHTML = active.map((j) => buildListItem(j, canAccess(j))).join("");
        activeEl.querySelectorAll(".build-card[data-id]").forEach((c) => {
          c.onclick = () => openBuildDetail(c.dataset.id);
        });
        activeEl.querySelectorAll(".btn-transfer").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            requestTransfer(btn.dataset.id);
          };
        });
      }
      const doneEl = document.getElementById("builds-done");
      if (!doneRes.length) doneEl.innerHTML = `<div class="empty-state" style="padding:12px">${t3("noBuilds")}</div>`;
      else {
        doneEl.innerHTML = doneRes.map((j) => buildListItem(j, canAccess(j))).join("");
        doneEl.querySelectorAll(".build-card[data-id]").forEach((c) => {
          c.onclick = () => openBuildDetail(c.dataset.id);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
  function buildListItem(j, canAccess) {
    var _a;
    const stages = ((_a = j.product) == null ? void 0 : _a.stages) || [];
    const done = (j.stages_completed || []).length;
    const pct = stages.length ? Math.round(done / stages.length * 100) : 0;
    const ini = (j.work_order || "WO").replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
    return `<div class="build-card" data-id="${j.id}" style="cursor:pointer">
    <div class="build-card-head">
      <div class="build-avatar">${ini}</div>
      <div><div class="build-wo">${j.work_order} \u2014 ${j.model || ""}</div>
      <div class="build-meta">${j.operator_name || "\u2014"}${j.serial ? " \xB7 " + j.serial : ""}</div></div>
      <span class="build-pill ${pillClass(j.status)}">${statusLabel(j.status, t3)}</span>
    </div>
    <div class="build-progress-bar"><div class="build-progress-fill" style="width:${pct}%"></div></div>
    ${!canAccess && j.status === "in_progress" ? `<div style="padding:8px 14px"><button class="btn btn-ghost sm btn-transfer" data-id="${j.id}">${t3("requestTransfer")}</button></div>` : ""}
  </div>`;
  }
  async function requestTransfer(jobId) {
    try {
      await Transfers.create({ job_id: jobId, requester_id: State.user.id, status: "pending" });
      toast(t3("transferRequested"));
      renderBuilds();
    } catch (e) {
      toast(t3("errorSaving") + e.message);
    }
  }
  async function openBuildDetail(jobId) {
    var _a;
    try {
      const job = await Jobs.get(jobId);
      const canAccess = State.isSupervisor || job.operator_id === ((_a = State.user) == null ? void 0 : _a.id);
      const isActive = job.status === "scheduled" || job.status === "in_progress";
      if (!State.isSupervisor && canAccess && isActive) {
        const { openSlideshow: openSlideshow2 } = await Promise.resolve().then(() => (init_Slideshow(), Slideshow_exports));
        openSlideshow2(job);
        return;
      }
      await renderBuildDetail(job);
      AppShell.openScreen("build-screen");
    } catch (e) {
      toast(t3("errorLoading") + e.message);
    }
  }
  async function renderBuildDetail(job) {
    var _a, _b;
    const screen = document.getElementById("build-screen");
    const stages = ((_a = job.product) == null ? void 0 : _a.stages) || [];
    const completed = job.stages_completed || [];
    const pct = stages.length ? Math.round(completed.length / stages.length * 100) : 0;
    const logs = await StageLogs.getForJob(job.id);
    const logMap = {};
    logs.forEach((l) => {
      logMap[l.stage_id] = l;
    });
    const isSup = State.isSupervisor;
    const canAccess = isSup || job.operator_id === ((_b = State.user) == null ? void 0 : _b.id);
    screen.innerHTML = `
    <div class="topbar">
      <div class="topbar-inner">
        <button class="back-btn" onclick="AppShell.closeScreen('build-screen')">\u2039</button>
        <div><div class="topbar-title">${job.work_order} \u2014 ${job.model || ""}</div>
        <div class="topbar-sub">${job.operator_name || "\u2014"} \xB7 SN: ${job.serial || "\u2014"}</div></div>
        <span class="status-pill ${pillClass(job.status)}">${statusLabel(job.status, t3)}</span>
      </div>
    </div>
    <div class="page-pad">
      <div class="build-info-card">
        <div class="card-row"><span class="card-key">${t3("workOrder")}</span><span class="card-val">${job.work_order}</span></div>
        <div class="card-row"><span class="card-key">${t3("model")}</span><span class="card-val">${job.model || "\u2014"}</span></div>
        <div class="card-row"><span class="card-key">${t3("serialNo")}</span><span class="card-val">${job.serial || "\u2014"}</span></div>
        <div class="card-row"><span class="card-key">${t3("assignedOperator")}</span><span class="card-val">${job.operator_name || "\u2014"}</span></div>
        <div class="card-row"><span class="card-key">${t3("scheduledDate")}</span><span class="card-val">${job.scheduled_date || "\u2014"}</span></div>
        <div class="card-row"><span class="card-key">Progress</span><span class="card-val">${pct}% (${completed.length}/${stages.length} stages)</span></div>
      </div>

      ${canAccess && job.status !== "complete" ? `<button class="btn btn-primary full" style="margin-bottom:14px" onclick="window._openSlideshow()">\u25B6 ${t3("continueStepByStep")}</button>` : ""}

      <div class="section-title">${t3("qcForms")}</div>
      <div class="form-links">
        ${renderFormLink("assembly", job)}
        ${renderFormLink("pre-delivery", job)}
        ${renderFormLink("goods-in", job)}
        ${renderFormLink("repair-rework", job)}
      </div>

      <div class="section-title mt">Build stages</div>
      ${stages.map((s, i) => {
      const isDone = completed.includes(i);
      const isActive = job.current_stage === i;
      const log = logMap[i];
      const elapsed = log ? fmtDuration(log.started_at, log.ended_at) : "\u2014";
      return `<div class="card" style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px">
            <div style="width:28px;height:28px;border-radius:50%;background:${isDone ? "var(--green-bg)" : isActive ? "var(--amber-bg)" : "var(--surface3)"};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:${isDone ? "var(--green)" : isActive ? "var(--amber)" : "var(--text3)"};flex-shrink:0">${isDone ? "\u2713" : i + 1}</div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">${s.name}</div>
            <div style="font-size:12px;color:var(--text3)">Steps ${s.steps || ""} \xB7 Est. ${s.est || "?"} min</div></div>
            <span style="font-size:12px;font-family:var(--mono);color:${isDone ? "var(--green)" : isActive ? "var(--amber)" : "var(--text3)"}">${elapsed}</span>
          </div>
        </div>`;
    }).join("")}

      ${isSup ? `<div class="divider"></div>
      <div class="section-title">Supervisor controls</div>
      <div class="gap-row">
        <button class="btn btn-ghost sm" onclick="window._setJobStatus('hold')">Put on hold</button>
        <button class="btn btn-ghost sm" onclick="window._setJobStatus('scheduled')">Reset</button>
        ${job.status !== "complete" ? `<button class="btn btn-success sm" onclick="window._setJobStatus('complete')">Mark complete</button>` : ""}
      </div>` : ""}
    </div>`;
    window._openSlideshow = async () => {
      const { openSlideshow: openSlideshow2 } = await Promise.resolve().then(() => (init_Slideshow(), Slideshow_exports));
      openSlideshow2(job);
    };
    window._setJobStatus = async (status) => {
      try {
        await Jobs.update(job.id, { status });
        const updated = await Jobs.get(job.id);
        renderBuildDetail(updated);
        toast(`Status: ${status}`);
      } catch (e) {
        toast(t3("errorSaving") + e.message);
      }
    };
    window._openQCForm = async (type, jobId) => {
      const { openQCForm: openQCForm2 } = await Promise.resolve().then(() => (init_QCForm(), QCForm_exports));
      openQCForm2(type, jobId);
    };
  }
  function renderFormLink(type, job) {
    const done = job.qc_records && job.qc_records[type];
    const icons = { assembly: "\u{1F529}", "pre-delivery": "\u{1F4CB}", "goods-in": "\u{1F4E6}", "repair-rework": "\u{1F527}" };
    const titles = { assembly: t3("assemblyQC"), "pre-delivery": t3("preDelivery"), "goods-in": t3("goodsIn"), "repair-rework": t3("repairRework") };
    const subs = { assembly: t3("assemblyQCSub"), "pre-delivery": t3("comingSoon"), "goods-in": t3("comingSoon"), "repair-rework": t3("comingSoon") };
    const avail = type === "assembly";
    return `<div class="form-link-card" style="${avail ? "" : "opacity:.5;pointer-events:none"}" onclick="${avail ? `window._openQCForm('${type}','${job.id}')` : ""}">
    <div class="form-link-icon">${icons[type] || "\u{1F4CB}"}</div>
    <div><div class="form-link-title">${titles[type] || type}</div><div class="form-link-sub">${subs[type] || ""}</div></div>
    <span class="badge ${done ? "badge-ok" : "badge-pending"}">${done ? t3("complete") : t3("pending")}</span>
  </div>`;
  }
  var t3;
  var init_Builds = __esm({
    "pages/Builds.js"() {
      init_db();
      init_state();
      init_utils();
      init_i18n();
      t3 = (k) => i18n.t(k);
    }
  });

  // pages/ProductBuilder.js
  var ProductBuilder_exports = {};
  __export(ProductBuilder_exports, {
    renderProductBuilder: () => renderProductBuilder
  });
  function renderProductBuilder(product) {
    const screen = document.getElementById("product-screen");
    AppShell.openScreen("product-screen");
    const isNew = !product;
    let stages = JSON.parse(JSON.stringify((product == null ? void 0 : product.stages) || []));
    let name = (product == null ? void 0 : product.name) || "";
    let desc = (product == null ? void 0 : product.description) || "";
    function render() {
      screen.innerHTML = `
      <div class="topbar">
        <div class="topbar-inner">
          <button class="back-btn" onclick="AppShell.closeScreen('product-screen')">\u2039</button>
          <div><div class="topbar-title">${isNew ? "New product" : "Edit product"}</div></div>
          <button class="btn btn-primary sm" onclick="window._pbSave()">Save</button>
        </div>
      </div>
      <div class="page-pad">
        <div class="field"><label>Product name</label><input type="text" id="pb-name" value="${name}" placeholder="e.g. Caremed Standard"></div>
        <div class="field"><label>Description</label><input type="text" id="pb-desc" value="${desc}" placeholder="Short description"></div>

        <div style="background:var(--brand-light);border:1px solid var(--brand-mid);border-radius:var(--r);padding:14px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:600;color:var(--brand);margin-bottom:6px">\u2726 Import stages with Claude AI</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5">Describe your build process and Claude will generate all the stages, torque specs and checklists automatically.</div>
          <button class="btn btn-primary sm" onclick="window._pbClaudeImport()">Open Claude prompt</button>
        </div>

        <div class="section-title mt">Build stages (${stages.length})</div>
        <div id="pb-stages">
          ${stages.map((s, i) => `
            <div class="stage-builder" id="pbstg-${i}">
              <div class="stage-builder-head">
                <span class="drag-handle">\u283F</span>
                <div style="flex:1"><strong style="font-size:14px">${i + 1}. ${s.name || "Untitled stage"}</strong>
                  <div style="font-size:12px;color:var(--text3)">${(s.bolts || []).length} bolts \xB7 ${(s.items || []).length} checks \xB7 Est. ${s.est || "?"} min</div>
                </div>
                <button class="btn btn-ghost sm" onclick="window._pbEditStage(${i})">Edit</button>
                <button class="btn btn-danger sm" onclick="window._pbDeleteStage(${i})">\u2715</button>
              </div>
            </div>`).join("")}
        </div>
        <button class="add-btn" onclick="window._pbAddStage()">+ Add stage</button>

        ${!isNew ? `<div class="divider"></div>
        <button class="btn btn-danger full" onclick="window._pbDeactivate()">Deactivate product</button>` : ""}
      </div>`;
      window._pbSave = async () => {
        var _a;
        name = document.getElementById("pb-name").value.trim();
        desc = document.getElementById("pb-desc").value.trim();
        if (!name) {
          toast("Product name is required");
          return;
        }
        try {
          await Products.save({ ...product || {}, name, description: desc, stages, active: true, created_by: (_a = State.user) == null ? void 0 : _a.id });
          toast("Product saved");
          AppShell.closeScreen("product-screen");
          AppShell.refresh();
        } catch (e) {
          toast("Error: " + e.message);
        }
      };
      window._pbAddStage = () => {
        stages.push({ name: "", short: "", steps: "", est: 15, instructions: [], bolts: [], items: [] });
        editStage(stages.length - 1);
      };
      window._pbEditStage = (i) => editStage(i);
      window._pbDeleteStage = (i) => {
        stages.splice(i, 1);
        render();
      };
      window._pbClaudeImport = () => {
        const productName = document.getElementById("pb-name").value.trim() || "the product";
        const prompt = `You are helping configure a manufacturing production app for Caremed Healthcare Group.

I need you to generate a build sheet for: ${productName}

Please output a JSON array of build stages in EXACTLY this format \u2014 no extra text, just the raw JSON array:

[
  {
    "name": "Full stage name",
    "short": "6-char label",
    "steps": "1-3",
    "est": 15,
    "isCheckpoint": false,
    "banner": "",
    "instructions": ["Step instruction 1", "Step instruction 2"],
    "bolts": [
      { "ref": "S1-01", "desc": "Bolt description", "fix": "M8 Caphead 30mm", "spec": 25 }
    ],
    "items": []
  }
]

Rules:
- "short" must be 6 chars or less
- "est" is estimated minutes as a number
- "spec" is torque in Nm as a number
- For checkpoint/inspection stages: set "isCheckpoint": true, leave "bolts": [], put checklist items in "items": ["Check 1", "Check 2"]
- For normal stages: leave "items": [], put bolt torque specs in "bolts"
- "banner" is only used on checkpoint stages \u2014 a short warning message
- Include ALL bolts with their torque specs
- Be thorough \u2014 include every assembly step

Generate the stages now:`;
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay open";
        overlay.innerHTML = `<div class="modal-card" style="max-height:85vh;overflow-y:auto">
        <div class="modal-title">Import stages with Claude AI</div>

        <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">
          <strong>Step 1:</strong> Copy the prompt below<br>
          <strong>Step 2:</strong> Paste it into <a href="https://claude.ai" target="_blank" style="color:var(--brand)">claude.ai</a> and send it<br>
          <strong>Step 3:</strong> Copy Claude's response (the JSON array) and paste it below<br>
          <strong>Step 4:</strong> Click Import
        </div>

        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <label style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">Claude prompt \u2014 copy this</label>
            <button class="btn btn-ghost sm" onclick="navigator.clipboard.writeText(document.getElementById('claude-prompt').value).then(()=>this.textContent='Copied \u2713')">Copy</button>
          </div>
          <textarea id="claude-prompt" rows="6" style="width:100%;font-size:11px;font-family:var(--mono);padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text);resize:none">${prompt.replace(/`/g, "\\`")}</textarea>
        </div>

        <div style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:4px">Paste Claude's response here</label>
          <textarea id="claude-response" rows="8" style="width:100%;font-size:11px;font-family:var(--mono);padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text);resize:none" placeholder='[{"name":"Stage 1",...}]'></textarea>
        </div>

        <div id="claude-import-msg" style="display:none;padding:8px 12px;border-radius:var(--r-sm);font-size:13px;margin-bottom:12px"></div>

        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window._pbParseClaudeResponse()">Import stages</button>
        </div>
      </div>`;
        document.getElementById("modal-container").appendChild(overlay);
        window._pbParseClaudeResponse = () => {
          const raw = document.getElementById("claude-response").value.trim();
          const msg = document.getElementById("claude-import-msg");
          if (!raw) {
            msg.style.display = "block";
            msg.style.background = "var(--red-bg)";
            msg.style.color = "var(--red)";
            msg.textContent = "Please paste Claude's response first.";
            return;
          }
          try {
            const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
            const parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed)) throw new Error("Response must be a JSON array");
            if (!parsed.length) throw new Error("Array is empty");
            const normalised = parsed.map((s, i) => {
              var _a;
              return {
                name: s.name || `Stage ${i + 1}`,
                short: (s.short || ((_a = s.name) == null ? void 0 : _a.slice(0, 6)) || `S${i + 1}`).slice(0, 8),
                steps: s.steps || String(i + 1),
                est: Number(s.est) || 15,
                isCheckpoint: !!s.isCheckpoint,
                banner: s.banner || "",
                instructions: Array.isArray(s.instructions) ? s.instructions : [],
                bolts: Array.isArray(s.bolts) ? s.bolts.map((b) => ({ ref: b.ref || "", desc: b.desc || "", fix: b.fix || "", spec: Number(b.spec) || 0 })) : [],
                items: Array.isArray(s.items) ? s.items : []
              };
            });
            stages.length = 0;
            normalised.forEach((s) => stages.push(s));
            overlay.remove();
            render();
            Promise.resolve().then(() => (init_utils(), utils_exports)).then((m) => m.toast(`\u2713 Imported ${stages.length} stages from Claude`));
          } catch (e) {
            msg.style.display = "block";
            msg.style.background = "var(--red-bg)";
            msg.style.color = "var(--red)";
            msg.textContent = `Could not parse response: ${e.message}. Make sure you copied only the JSON array.`;
          }
        };
      };
      window._pbDeactivate = async () => {
        if (!confirm("Deactivate this product? It will be hidden from new jobs.")) return;
        try {
          await Products.deactivate(product.id);
          toast("Product deactivated");
          AppShell.closeScreen("product-screen");
          AppShell.refresh();
        } catch (e) {
          toast(e.message);
        }
      };
    }
    function editStage(idx) {
      const s = stages[idx];
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay open";
      overlay.innerHTML = `<div class="modal-card" style="max-height:85vh;overflow-y:auto">
      <div class="modal-title">Edit stage ${idx + 1}</div>
      <div class="field"><label>Name</label><input type="text" id="es-name" value="${s.name || ""}" placeholder="Stage name"></div>
      <div class="field"><label>Short label</label><input type="text" id="es-short" value="${s.short || ""}" placeholder="6 chars max" maxlength="8"></div>
      <div class="field"><label>Steps ref</label><input type="text" id="es-steps" value="${s.steps || ""}" placeholder="e.g. 1-3"></div>
      <div class="field"><label>Est. minutes</label><input type="number" id="es-est" value="${s.est || 15}" min="1" max="480"></div>
      <div class="field">
        <label>Type</label>
        <select id="es-type">
          <option value="normal"     ${!s.isCheckpoint ? "selected" : ""}>Normal stage</option>
          <option value="checkpoint" ${s.isCheckpoint ? "selected" : ""}>Checkpoint / visual inspection</option>
        </select>
      </div>
      <div class="field"><label>Instructions (one per line)</label>
        <textarea id="es-instr" rows="4" placeholder="Step 1...
Step 2...">${(s.instructions || []).join("\n")}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="window._esSave(${idx})">Save stage</button>
      </div>
    </div>`;
      document.getElementById("modal-container").appendChild(overlay);
      window._esSave = (i) => {
        stages[i] = {
          ...stages[i],
          name: document.getElementById("es-name").value.trim(),
          short: document.getElementById("es-short").value.trim(),
          steps: document.getElementById("es-steps").value.trim(),
          est: +document.getElementById("es-est").value || 15,
          isCheckpoint: document.getElementById("es-type").value === "checkpoint",
          instructions: document.getElementById("es-instr").value.split("\n").map((s2) => s2.trim()).filter(Boolean)
        };
        overlay.remove();
        render();
      };
    }
    render();
  }
  var init_ProductBuilder = __esm({
    "pages/ProductBuilder.js"() {
      init_db();
      init_state();
      init_utils();
    }
  });

  // pages/Settings.js
  var Settings_exports = {};
  __export(Settings_exports, {
    showSettingsModal: () => showSettingsModal
  });
  function showSettingsModal() {
    var _a, _b;
    modal(`
    <div class="modal-title">${t8("settings")}</div>
    <div class="card-pad" style="background:var(--surface2);border-radius:var(--r-sm);margin-bottom:12px">
      <div style="font-size:14px;font-weight:500">${State.displayName}</div>
      <div style="font-size:12px;color:var(--text3)">${((_a = State.user) == null ? void 0 : _a.email) || ""} \xB7 ${t8(((_b = State.profile) == null ? void 0 : _b.role) || "operator")}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="window._closeModal()">${t8("close")}</button>
      <button class="btn btn-danger"    onclick="window._signOut()">${t8("signOut")}</button>
    </div>`);
    window._closeModal = closeModal;
    window._signOut = async () => {
      await Auth.signOut();
      location.reload();
    };
  }
  var t8;
  var init_Settings = __esm({
    "pages/Settings.js"() {
      init_db();
      init_state();
      init_utils();
      init_i18n();
      t8 = (k) => i18n.t(k);
    }
  });

  // main.js
  init_db();
  init_state();

  // pages/Login.js
  init_db();
  init_state();
  init_utils();
  init_i18n();
  var t = (k) => i18n.t(k);
  function renderLogin(onSuccess) {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="login-screen">
      <div style="background:rgba(255,255,255,.15);border-radius:16px;width:80px;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <div style="text-align:center;line-height:1">
          <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-1px">Care</span><span style="font-size:28px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:-1px">med</span>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:4px">
        <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:22px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:-0.5px">med</span>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px;letter-spacing:.5px;text-transform:uppercase">Healthcare Group</p>
      <p class="login-sub" style="margin-top:16px">${t("loginSub")}</p>
      <div class="login-card">
        <div class="login-error" id="login-error"></div>
        <div class="field">
          <label>${t("username")}</label>
          <input type="text" id="login-user" placeholder="name@caremed-group.com" autocomplete="username" autocapitalize="none" spellcheck="false">
        </div>
        <div class="field">
          <label>${t("password")}</label>
          <input type="password" id="login-pass" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="current-password">
        </div>
        <button class="btn btn-primary full" id="login-btn" onclick="window._loginSubmit()">${t("signIn")}</button>
        <div style="text-align:center;margin-top:16px">
          <button onclick="window._showForgotPassword()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;text-decoration:underline;font-family:var(--sans)">Forgot password?</button>
        </div>
      </div>
    </div>

    <div id="forgot-screen" style="display:none;position:fixed;inset:0;background:linear-gradient(135deg,#3A3A7F 0%,#2a2a6f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px">
      <div style="text-align:center;margin-bottom:4px">
        <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:22px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:-0.5px">med</span>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:32px;margin-top:4px;letter-spacing:.5px;text-transform:uppercase">Healthcare Group</p>
      <div class="login-card">
        <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:6px">Reset password</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Enter your email and we'll send a reset link.</div>
        <div id="forgot-msg" style="display:none;border-radius:var(--r-sm);padding:10px 12px;font-size:13px;margin-bottom:12px"></div>
        <div class="field">
          <label>Email</label>
          <input type="email" id="forgot-email" placeholder="your.name@caremed-group.com" autocapitalize="none">
        </div>
        <button class="btn btn-primary full" id="forgot-btn" onclick="window._sendReset()">Send reset link</button>
        <div style="text-align:center;margin-top:14px">
          <button onclick="window._showLogin()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;font-family:var(--sans)">\u2190 Back to sign in</button>
        </div>
      </div>
    </div>`;
    window._loginSubmit = async () => {
      const username = document.getElementById("login-user").value.trim();
      const password = document.getElementById("login-pass").value;
      const btn = document.getElementById("login-btn");
      const errEl = document.getElementById("login-error");
      if (!username || !password) {
        errEl.textContent = t("invalidCredentials");
        errEl.classList.add("show");
        return;
      }
      btn.disabled = true;
      btn.textContent = "...";
      errEl.classList.remove("show");
      try {
        const { user } = await Auth.signIn(username, password);
        State.user = user;
        await State.loadProfile();
        onSuccess();
      } catch (e) {
        errEl.textContent = (e == null ? void 0 : e.message) || "Sign in failed \u2014 unknown error";
        errEl.classList.add("show");
        btn.disabled = false;
        btn.textContent = t("signIn");
      }
    };
    document.getElementById("login-pass").addEventListener("keydown", (e) => {
      if (e.key === "Enter") window._loginSubmit();
    });
    window._showForgotPassword = () => {
      document.querySelector(".login-screen").style.display = "none";
      const f = document.getElementById("forgot-screen");
      f.style.display = "flex";
      f.style.flexDirection = "column";
      f.style.alignItems = "center";
      f.style.justifyContent = "center";
    };
    window._showLogin = () => {
      document.getElementById("forgot-screen").style.display = "none";
      document.querySelector(".login-screen").style.display = "flex";
    };
    window._sendReset = async () => {
      const email = document.getElementById("forgot-email").value.trim();
      const btn = document.getElementById("forgot-btn");
      const msg = document.getElementById("forgot-msg");
      if (!email) {
        msg.style.display = "block";
        msg.style.background = "var(--red-bg)";
        msg.style.color = "var(--red)";
        msg.textContent = "Please enter your email address.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Sending...";
      try {
        const { error } = await getClient().auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/?reset=1"
        });
        if (error) throw error;
        msg.style.display = "block";
        msg.style.background = "var(--green-bg)";
        msg.style.color = "var(--green)";
        msg.style.border = "1px solid var(--green-light)";
        msg.textContent = "\u2713 Reset link sent \u2014 check your email.";
        btn.textContent = "Sent";
      } catch (e) {
        msg.style.display = "block";
        msg.style.background = "var(--red-bg)";
        msg.style.color = "var(--red)";
        msg.textContent = e.message || "Something went wrong. Try again.";
        btn.disabled = false;
        btn.textContent = "Send reset link";
      }
    };
  }

  // pages/App.js
  init_state();
  init_db();
  init_utils();
  init_i18n();

  // pages/Dashboard.js
  init_db();
  init_state();
  init_utils();
  init_i18n();
  var t4 = (k) => i18n.t(k);
  async function renderDashboard() {
    const el = document.getElementById("tab-dashboard");
    if (!el) return;
    el.innerHTML = `<div class="page-pad"><div class="stat-grid">
    <div class="stat-card blue"><div class="stat-num" id="ds-sched">\u2014</div><div class="stat-lbl">${t4("scheduledToday")}</div></div>
    <div class="stat-card"><div class="stat-num" id="ds-prog">\u2014</div><div class="stat-lbl">${t4("inProgress")}</div></div>
    <div class="stat-card green"><div class="stat-num" id="ds-done">\u2014</div><div class="stat-lbl">${t4("completedToday")}</div></div>
    <div class="stat-card amber"><div class="stat-num" id="ds-hold">\u2014</div><div class="stat-lbl">${t4("onHold")}</div></div>
  </div>
  ${State.isSupervisor ? `<div id="ds-transfers"></div>` : ""}
  <div class="section-title mt">${t4("liveBuilds")}</div>
  <div id="ds-live"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>
  <div class="section-title mt">${t4("todaySchedule")}</div>
  <div id="ds-today"></div>
  </div>`;
    try {
      const [stats, live, todayJobs] = await Promise.all([
        Jobs.getTodayStats(),
        Jobs.getAll({ status: "in_progress" }),
        Jobs.getAll({ date: today() })
      ]);
      document.getElementById("ds-sched").textContent = stats.scheduled;
      document.getElementById("ds-prog").textContent = stats.inProgress;
      document.getElementById("ds-done").textContent = stats.complete;
      document.getElementById("ds-hold").textContent = stats.onHold;
      if (State.isSupervisor) {
        const transfers = await Transfers.getAll();
        const tEl = document.getElementById("ds-transfers");
        if (tEl && transfers.length) {
          tEl.innerHTML = `<div class="section-title mt">${t4("transferRequest")}</div>` + transfers.map((tr) => {
            var _a, _b;
            return `<div class="transfer-card">
            <div class="transfer-title">${t4("transferRequest")}: ${((_a = tr.job) == null ? void 0 : _a.work_order) || "\u2014"}</div>
            <div class="transfer-meta">Operator wants to take this job \xB7 ${((_b = tr.job) == null ? void 0 : _b.model) || ""}</div>
            <div class="transfer-actions">
              <button class="btn btn-success sm" onclick="window._approveTransfer('${tr.id}','${tr.job_id}','${tr.requester_id}')">\u2713 ${t4("approve")}</button>
              <button class="btn btn-danger sm"  onclick="window._declineTransfer('${tr.id}')">\u2717 ${t4("decline")}</button>
            </div>
          </div>`;
          }).join("");
          window._approveTransfer = async (trId, jobId, requesterId) => {
            try {
              await Jobs.update(jobId, { operator_id: requesterId });
              await Transfers.respond(trId, "approved", State.user.id);
              renderDashboard();
            } catch (e) {
            }
          };
          window._declineTransfer = async (trId) => {
            try {
              await Transfers.respond(trId, "declined", State.user.id);
              renderDashboard();
            } catch (e) {
            }
          };
        }
      }
      const liveEl = document.getElementById("ds-live");
      if (!live.length) liveEl.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F529}</div>${t4("noActiveBuilds")}</div>`;
      else {
        liveEl.innerHTML = live.map((j) => buildCard(j)).join("");
        liveEl.querySelectorAll(".build-card").forEach((c, i) => {
          c.onclick = () => openBuild(live[i].id);
        });
      }
      const pending = todayJobs.filter((j) => j.status === "scheduled");
      const todayEl = document.getElementById("ds-today");
      if (!pending.length) todayEl.innerHTML = `<div class="empty-state" style="padding:12px">${t4("noJobsToday")}</div>`;
      else {
        todayEl.innerHTML = pending.map((j) => {
          var _a;
          return `<div class="job-card" onclick="openBuild('${j.id}')">
        <div class="job-dot" style="background:${statusColor(j.status)}"></div>
        <div><div class="job-wo">${j.work_order} \u2014 ${j.model || ((_a = j.product) == null ? void 0 : _a.name) || ""}</div>
        <div class="job-meta">${j.operator_name || "\u2014"}</div></div>
        <span class="badge badge-pending">${t4("scheduled")}</span>
      </div>`;
        }).join("");
      }
    } catch (e) {
      console.error("Dashboard error:", e);
      const liveEl = document.getElementById("ds-live");
      if (liveEl && liveEl.innerHTML.includes("Loading")) {
        liveEl.innerHTML = `<div class="empty-state"><div class="empty-icon">\u26A0\uFE0F</div>Could not load builds \u2014 ${e.message}</div>`;
      }
      const todayEl = document.getElementById("ds-today");
      if (todayEl && !todayEl.innerHTML) {
        todayEl.innerHTML = `<div class="empty-state" style="padding:12px">Could not load schedule</div>`;
      }
    }
  }
  function buildCard(j) {
    var _a, _b;
    const stages = ((_a = j.product) == null ? void 0 : _a.stages) || [];
    const done = (j.stages_completed || []).length;
    const pct = stages.length ? Math.round(done / stages.length * 100) : 0;
    const ini = (j.work_order || "WO").replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
    return `<div class="build-card">
    <div class="build-card-head">
      <div class="build-avatar">${ini}</div>
      <div><div class="build-wo">${j.work_order} \u2014 ${j.model || ((_b = j.product) == null ? void 0 : _b.name) || ""}</div>
      <div class="build-meta">${j.operator_name || "\u2014"} \xB7 ${j.serial || "\u2014"}</div></div>
      <span class="build-pill ${pillClass(j.status)}">${statusLabel(j.status, t4)}</span>
    </div>
    <div class="build-progress-bar"><div class="build-progress-fill" style="width:${pct}%"></div></div>
    <div class="build-stages">${stages.slice(0, 5).map((s, i) => {
      var _a2;
      return `<span class="stage-dot ${(j.stages_completed || []).includes(i) ? "done" : j.current_stage === i ? "active" : ""}">${s.short || ((_a2 = s.name) == null ? void 0 : _a2.slice(0, 6)) || i + 1}</span>`;
    }).join("")}${stages.length > 5 ? `<span class="stage-dot">+${stages.length - 5}</span>` : ""}</div>
  </div>`;
  }
  async function openBuild(id) {
    const { openBuildDetail: openBuildDetail2 } = await Promise.resolve().then(() => (init_Builds(), Builds_exports));
    openBuildDetail2(id);
  }
  window.openBuild = openBuild;

  // pages/StockRequest.js
  init_state();
  init_db();
  init_utils();
  function openStockRequest() {
    const screen = document.getElementById("build-screen");
    AppShell.openScreen("build-screen");
    screen.innerHTML = `
    <div class="topbar">
      <div class="topbar-inner">
        <button class="back-btn" onclick="AppShell.closeScreen('build-screen')">\u2039</button>
        <div>
          <div class="topbar-title">Request stock</div>
          <div class="topbar-sub">Scan barcode or enter manually</div>
        </div>
      </div>
    </div>

    <div class="page-pad">

      <!-- Scanner area -->
      <div id="scanner-wrap" style="margin-bottom:16px">
        <div style="background:#000;border-radius:var(--r);overflow:hidden;position:relative;aspect-ratio:4/3;max-height:260px;display:flex;align-items:center;justify-content:center" id="cam-wrap">
          <video id="cam-video" style="width:100%;height:100%;object-fit:cover" playsinline autoplay muted></video>
          <div id="scan-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none">
            <div style="width:220px;height:80px;border:2px solid #5de88a;border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,0.45)"></div>
            <div style="color:#5de88a;font-size:12px;margin-top:10px;font-weight:500">Align barcode within frame</div>
          </div>
          <div id="cam-placeholder" style="position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:var(--surface3)">
            <div style="font-size:40px;margin-bottom:8px">\u{1F4F7}</div>
            <div style="font-size:13px;color:var(--text3)">Camera not available</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary sm" id="scan-btn" onclick="window._srStartScan()" style="flex:1">\u{1F4F7} Start camera</button>
          <button class="btn btn-secondary sm" id="stop-btn" onclick="window._srStopScan()" style="flex:1;display:none">\u23F9 Stop</button>
        </div>
      </div>

      <!-- Manual entry -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <span style="font-size:12px;color:var(--text3)">or enter barcode manually</span>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input type="text" id="sr-barcode-input" placeholder="EAN-13 barcode" inputmode="numeric"
          style="flex:1;font-size:14px;font-family:var(--mono);padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
        <button class="btn btn-primary" onclick="window._srLookup()">Look up</button>
      </div>

      <!-- Result card -->
      <div id="sr-result" style="display:none"></div>

      <!-- Request form -->
      <div id="sr-form" style="display:none">
        <div class="section-title mt">Purchase request</div>
        <div class="field">
          <label>Quantity needed</label>
          <input type="number" id="sr-qty" value="1" min="1" style="font-size:16px;font-family:var(--mono)">
        </div>
        <div class="field">
          <label>Reason / notes (optional)</label>
          <textarea id="sr-notes" rows="2" placeholder="e.g. Running low, needed for WO-0045..."></textarea>
        </div>
        <button class="btn btn-primary full" onclick="window._srSendRequest()">\u{1F4E7} Send purchase request</button>
      </div>

    </div>`;
    let stream = null;
    let scanInterval = null;
    let currentItem = null;
    window._srStartScan = async () => {
      const video = document.getElementById("cam-video");
      const scanBtn = document.getElementById("scan-btn");
      const stopBtn = document.getElementById("stop-btn");
      const placeholder = document.getElementById("cam-placeholder");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = stream;
        scanBtn.style.display = "none";
        stopBtn.style.display = "block";
        if ("BarcodeDetector" in window) {
          const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39"] });
          scanInterval = setInterval(async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                  const code = barcodes[0].rawValue;
                  document.getElementById("sr-barcode-input").value = code;
                  window._srStopScan();
                  window._srLookup();
                }
              } catch (e) {
              }
            }
          }, 500);
        } else {
          toast("Auto-detect not supported on this browser \u2014 enter barcode manually");
        }
      } catch (e) {
        placeholder.style.display = "flex";
        video.style.display = "none";
        document.getElementById("scan-overlay").style.display = "none";
        toast("Camera access denied \u2014 please enter barcode manually");
      }
    };
    window._srStopScan = () => {
      if (stream) {
        stream.getTracks().forEach((t10) => t10.stop());
        stream = null;
      }
      if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
      }
      document.getElementById("scan-btn").style.display = "block";
      document.getElementById("stop-btn").style.display = "none";
    };
    window._srLookup = async () => {
      const barcode = document.getElementById("sr-barcode-input").value.trim();
      if (!barcode) {
        toast("Enter a barcode first");
        return;
      }
      const resultEl = document.getElementById("sr-result");
      const formEl = document.getElementById("sr-form");
      resultEl.style.display = "block";
      resultEl.innerHTML = `<div class="empty-state"><div class="empty-icon">\u23F3</div>Looking up barcode...</div>`;
      formEl.style.display = "none";
      try {
        const { data, error } = await getClient().from("stock_items").select("*").eq("barcode", barcode).single();
        if (error || !data) {
          resultEl.innerHTML = `<div style="background:var(--amber-bg);border:1px solid var(--amber-light);border-radius:var(--r);padding:14px">
          <div style="font-size:14px;font-weight:600;color:var(--amber);margin-bottom:4px">Item not found</div>
          <div style="font-size:13px;color:var(--text2)">Barcode <span style="font-family:var(--mono)">${barcode}</span> is not in the stock catalogue.</div>
          <div style="font-size:12px;color:var(--text3);margin-top:6px">Ask your supervisor to upload the product catalogue in Admin \u2192 Stock.</div>
        </div>`;
          return;
        }
        currentItem = data;
        resultEl.innerHTML = `<div style="background:var(--green-bg);border:1px solid var(--green-light);border-radius:var(--r);padding:14px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Item found \u2713</div>
        <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:4px">${data.description}</div>
        <div style="font-size:13px;color:var(--text3);font-family:var(--mono)">${data.product_code}</div>
        ${data.supplier_name ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">Supplier: ${data.supplier_name}</div>` : ""}
        ${data.unit_of_measure ? `<div style="font-size:12px;color:var(--text2)">Unit: ${data.unit_of_measure}</div>` : ""}
      </div>`;
        formEl.style.display = "block";
      } catch (e) {
        resultEl.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
      }
    };
    window._srSendRequest = () => {
      if (!currentItem) return;
      const qty = document.getElementById("sr-qty").value || "1";
      const notes = document.getElementById("sr-notes").value.trim();
      const op = State.displayName;
      const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB");
      const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const subject = `Purchase Request \u2014 ${currentItem.product_code} \u2014 ${currentItem.description}`;
      const body = [
        `PURCHASE REQUEST`,
        ``,
        `Requested by: ${op}`,
        `Date/time: ${date} ${time}`,
        ``,
        `ITEM DETAILS`,
        `Product code: ${currentItem.product_code}`,
        `Description:  ${currentItem.description}`,
        `Barcode:      ${currentItem.barcode || "\u2014"}`,
        `Supplier:     ${currentItem.supplier_name || "\u2014"}`,
        `Supplier ref: ${currentItem.supplier_product_code || "\u2014"}`,
        `Unit:         ${currentItem.unit_of_measure || "\u2014"}`,
        ``,
        `REQUEST`,
        `Quantity needed: ${qty} ${currentItem.unit_of_measure || "units"}`,
        notes ? `Notes: ${notes}` : "",
        ``,
        `---`,
        `Sent from Caremed Production App`
      ].filter((l) => l !== void 0).join("\n");
      const mailto = `mailto:${window._srPurchaseEmail || "purchasing@caremed-group.com"}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      toast("Email app opened \u2014 review and send");
    };
    document.getElementById("sr-barcode-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") window._srLookup();
    });
  }

  // pages/Scheduler.js
  init_db();
  init_state();
  init_utils();
  init_i18n();
  var t5 = (k) => i18n.t(k);
  function toISO(d) {
    return new Date(d).toISOString().split("T")[0];
  }
  function addDays(d, n) {
    return new Date(new Date(d).setDate(new Date(d).getDate() + n));
  }
  function getMonday(d) {
    const r = new Date(d);
    const day = r.getDay();
    r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
    r.setHours(0, 0, 0, 0);
    return r;
  }
  function fmtWeek(d) {
    const e = addDays(d, 6);
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} \u2013 ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  }
  var _weekStart = getMonday(/* @__PURE__ */ new Date());
  async function renderScheduler() {
    const el = document.getElementById("tab-scheduler");
    if (!el) return;
    const isSup = State.isSupervisor;
    el.innerHTML = `<div class="page-pad">
    <div class="row-between">
      <div class="section-title" style="margin:0">${t5("scheduler")}</div>
      ${isSup ? `<button class="btn btn-primary sm" onclick="window._newJob()">+ New job</button>` : ""}
    </div>
    <div class="week-nav" style="margin-top:12px">
      <button class="btn btn-secondary sm" onclick="window._weekNav(-7)">\u2039 Prev</button>
      <span class="week-lbl" id="sched-week-lbl"></span>
      <button class="btn btn-secondary sm" onclick="window._weekNav(7)">Next \u203A</button>
    </div>
    <div id="sched-days"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>
  </div>`;
    window._weekNav = (days) => {
      _weekStart = addDays(_weekStart, days);
      loadWeek();
    };
    window._newJob = isSup ? () => showCreateModal() : null;
    loadWeek();
  }
  async function loadWeek() {
    const lbl = document.getElementById("sched-week-lbl");
    const el = document.getElementById("sched-days");
    if (!lbl || !el) return;
    lbl.textContent = fmtWeek(_weekStart);
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div>';
    try {
      const weekEnd = addDays(_weekStart, 6);
      const jobs = await Jobs.getAll({ from: toISO(_weekStart), to: toISO(weekEnd) });
      const days = Array.from({ length: 7 }, (_, i) => addDays(_weekStart, i));
      const todayStr = toISO(/* @__PURE__ */ new Date());
      el.innerHTML = days.map((d) => {
        const ds = toISO(d);
        const dayJobs = jobs.filter((j) => j.scheduled_date === ds);
        const isToday = ds === todayStr;
        return `<div class="day-row">
        <div class="day-head">
          <span>${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
          ${isToday ? '<span class="today-tag">Today</span>' : ""}
        </div>
        ${dayJobs.length ? dayJobs.map((j) => {
          var _a;
          return `<div class="job-card" onclick="window._openBuild('${j.id}')">
              <div class="job-dot" style="background:${statusColor(j.status)}"></div>
              <div style="flex:1">
                <div class="job-wo">${j.work_order} \u2014 ${j.model || ((_a = j.product) == null ? void 0 : _a.name) || ""}</div>
                <div class="job-meta">${j.operator_name || "\u2014"}</div>
              </div>
              <span class="badge ${j.status === "complete" ? "badge-ok" : j.status === "hold" ? "badge-fail" : "badge-pending"}">${statusLabel(j.status, t5)}</span>
            </div>`;
        }).join("") : '<div style="padding:4px 0 6px;font-size:12px;color:var(--text3)">No jobs</div>'}
      </div>`;
      }).join("");
      window._openBuild = async (id) => {
        const { openBuildDetail: openBuildDetail2 } = await Promise.resolve().then(() => (init_Builds(), Builds_exports));
        openBuildDetail2(id);
      };
    } catch (e) {
      console.error(e);
    }
  }
  function showCreateModal() {
    modal(`
    <div class="modal-title">Schedule new job</div>
    <div id="create-modal-body"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>`);
    Promise.all([Profiles.getAll(), Products.getAll()]).then(([operators, products]) => {
      const body = document.getElementById("create-modal-body");
      if (!body) return;
      const ops = operators.filter((u) => u.active !== false);
      body.innerHTML = `
      <div class="field"><label>${t5("workOrder")}</label><input type="text" id="nj-wo" placeholder="WO-2045"></div>
      <div class="field"><label>${t5("model")}</label>
        <select id="nj-product">${products.map((p) => `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join("")}</select>
      </div>
      <div class="field"><label>${t5("serialNo")}</label><input type="text" id="nj-serial" placeholder="SN-00123"></div>
      <div class="field"><label>${t5("assignedOperator")}</label>
        <select id="nj-operator">${ops.map((u) => `<option value="${u.id}" data-name="${u.display_name}">${u.display_name}</option>`).join("")}</select>
      </div>
      <div class="field"><label>${t5("scheduledDate")}</label><input type="date" id="nj-date" value="${toISO(/* @__PURE__ */ new Date())}"></div>
      <div class="field"><label>Notes</label><textarea id="nj-notes" rows="2" placeholder="Any special instructions..."></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="window._closeModal()">${t5("cancel")}</button>
        <button class="btn btn-primary"   onclick="window._createJob()">Create job</button>
      </div>`;
      window._closeModal = closeModal;
      window._createJob = async () => {
        var _a, _b, _c, _d, _e;
        const wo = document.getElementById("nj-wo").value.trim();
        const prodSel = document.getElementById("nj-product");
        const prodId = prodSel.value;
        const model = ((_b = (_a = prodSel.options[prodSel.selectedIndex]) == null ? void 0 : _a.dataset) == null ? void 0 : _b.name) || "";
        const serial = document.getElementById("nj-serial").value.trim();
        const opSel = document.getElementById("nj-operator");
        const opId = opSel.value;
        const opName = ((_d = (_c = opSel.options[opSel.selectedIndex]) == null ? void 0 : _c.dataset) == null ? void 0 : _d.name) || "";
        const date = document.getElementById("nj-date").value;
        const notes = document.getElementById("nj-notes").value.trim();
        if (!wo || !date) {
          toast("Please enter a work order and date");
          return;
        }
        try {
          await Jobs.create({ work_order: wo, product_id: prodId, model, serial, operator_id: opId, operator_name: opName, scheduled_date: date, notes: notes || void 0, created_by: (_e = State.user) == null ? void 0 : _e.id });
          closeModal();
          toast("Job created");
          loadWeek();
        } catch (e) {
          toast("Error: " + e.message);
        }
      };
    });
  }

  // pages/App.js
  init_Builds();

  // pages/Records.js
  init_db();
  init_i18n();
  var t6 = (k) => i18n.t(k);
  async function renderRecords() {
    const el = document.getElementById("tab-records");
    if (!el) return;
    el.innerHTML = `<div class="page-pad">
    <div class="section-title">${t6("qcRecords")}</div>
    <div class="search-wrap"><input type="search" id="rec-search" placeholder="${t6("searchRecords")}" oninput="window._recSearch(this.value)"></div>
    <div id="records-list"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>
  </div>`;
    window._recSearch = (v) => {
      clearTimeout(window._rst);
      window._rst = setTimeout(() => loadRecords(v), 300);
    };
    await loadRecords("");
  }
  async function loadRecords(search) {
    const el = document.getElementById("records-list");
    if (!el) return;
    try {
      const recs = search ? await QCRecords.search(search) : await QCRecords.getAll();
      if (!recs.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F4CB}</div>${t6("noRecords")}</div>`;
        return;
      }
      el.innerHTML = recs.map((r) => `<div class="card card-pad" style="margin-bottom:8px">
      <div style="font-size:14px;font-weight:500">${r.work_order || r.job_id} \u2014 ${r.form_type}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:3px">SN: ${r.serial || "\u2014"} \xB7 ${r.operator_name || "\u2014"} \xB7 ${new Date(r.updated_at).toLocaleDateString("en-GB")}</div>
      <div style="margin-top:6px"><span class="badge badge-ok">${t6("submitted")}</span></div>
    </div>`).join("");
    } catch (e) {
      el.innerHTML = `<div class="empty-state">Error loading records</div>`;
    }
  }

  // pages/Admin.js
  init_db();

  // pages/StockAdmin.js
  init_db();
  init_state();
  init_utils();
  async function renderStockAdmin(el) {
    if (!el) return;
    el.innerHTML = `<div class="page-pad">
    <div class="row-between" style="margin-bottom:16px">
      <div class="section-title" style="margin:0">Stock catalogue</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary sm" onclick="window._stockExportTemplate()">\u2193 Template</button>
        <button class="btn btn-primary sm" onclick="document.getElementById('csv-upload').click()">\u2191 Upload CSV</button>
      </div>
    </div>
    <input type="file" id="csv-upload" accept=".csv" style="display:none" onchange="window._stockImportCSV(this)">

    <div style="background:var(--blue-bg);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--blue);line-height:1.5">
      Upload your Unleashed product CSV to add items to the stock catalogue.
      Operators can then scan barcodes to request purchases.
      These items <strong>do not appear</strong> in the build/job screens.
    </div>

    <div class="search-wrap">
      <input type="search" id="stock-search" placeholder="Search by code, description or barcode..."
        oninput="window._stockSearch(this.value)">
    </div>

    <div id="stock-list"><div class="empty-state"><div class="empty-icon">\u23F3</div>Loading...</div></div>

    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <div class="section-title">Purchase request email</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">
        Purchase requests from operators will be sent to this address.
      </div>
      <div style="display:flex;gap:8px">
        <input type="email" id="purchase-email" placeholder="purchasing@caremed-group.com"
          value="${localStorage.getItem("cm_purchase_email") || ""}"
          style="flex:1;font-size:14px;font-family:var(--sans);padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
        <button class="btn btn-primary sm" onclick="window._savePurchaseEmail()">Save</button>
      </div>
    </div>
  </div>`;
    loadStock("");
    window._stockSearch = (v) => {
      clearTimeout(window._stockST);
      window._stockST = setTimeout(() => loadStock(v), 300);
    };
    window._savePurchaseEmail = () => {
      const email = document.getElementById("purchase-email").value.trim();
      localStorage.setItem("cm_purchase_email", email);
      window._srPurchaseEmail = email;
      toast("Purchase email saved");
    };
    window._srPurchaseEmail = localStorage.getItem("cm_purchase_email") || "purchasing@caremed-group.com";
    window._stockExportTemplate = () => {
      const headers = [
        "*Product Code",
        "*Product Description",
        "Notes",
        "Barcode",
        "Unit of Measure",
        "Min Stock Alert Level",
        "Max Stock Alert Level",
        "Label Template",
        "SO Label Template",
        "PO Label Template",
        "SO Label Quantity",
        "PO Label Quantity",
        "Supplier Code",
        "Supplier Name",
        "Supplier Product Code",
        "Default Purchase Price",
        "Minimum Order Quantity",
        "Minimum Sale Quantity",
        "Default Sell Price",
        "Minimum Sell Price",
        "Sell Price Tier 1",
        "Sell Price Tier 2",
        "Sell Price Tier 3",
        "Sell Price Tier 4",
        "Sell Price Tier 5",
        "Sell Price Tier 6",
        "Sell Price Tier 7",
        "Sell Price Tier 8",
        "Sell Price Tier 9",
        "Sell Price Tier 10",
        "Pack Size",
        "Weight",
        "Width",
        "Height",
        "Depth",
        "Reminder",
        "Last Cost",
        "Nominal Cost",
        "Comments",
        "Copy Comments for Sales",
        "Copy Comments for Purchases",
        "Never Diminishing",
        "Product Group",
        "Product Sub Group",
        "Product Brand",
        "Sales Account",
        "COGS Account",
        "Purchase Account",
        "Purchase Tax Type",
        "Purchase Tax Rate",
        "Sales Tax Type",
        "Sale Tax Rate",
        "IsAssembledProduct",
        "IsComponent",
        "IsObsoleted",
        "Is Sellable",
        "Is Purchasable",
        "Default Purchasing Unit of Measure",
        "Is Serialized"
      ];
      const csv = headers.join(",") + "\n";
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Caremed_Products_Template.csv";
      a.click();
      toast("Template downloaded");
    };
    window._stockImportCSV = async (input) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
      const file = input.files[0];
      if (!file) return;
      const listEl = document.getElementById("stock-list");
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">\u23F3</div>Importing...</div>`;
      try {
        const text = await file.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          toast("CSV appears empty");
          return;
        }
        const headers = parseCSVLine(lines[0]);
        const idx = {
          code: headers.findIndex((h) => h.replace(/\*/g, "").trim() === "Product Code"),
          desc: headers.findIndex((h) => h.replace(/\*/g, "").trim() === "Product Description"),
          notes: headers.indexOf("Notes"),
          barcode: headers.indexOf("Barcode"),
          uom: headers.indexOf("Unit of Measure"),
          minStock: headers.indexOf("Min Stock Alert Level"),
          maxStock: headers.indexOf("Max Stock Alert Level"),
          supplierCode: headers.indexOf("Supplier Code"),
          supplierName: headers.indexOf("Supplier Name"),
          supplierProd: headers.indexOf("Supplier Product Code"),
          buyPrice: headers.indexOf("Default Purchase Price"),
          minQty: headers.indexOf("Minimum Order Quantity"),
          group: headers.indexOf("Product Group"),
          subGroup: headers.indexOf("Product Sub Group"),
          brand: headers.indexOf("Product Brand")
        };
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (!((_a = cols[idx.code]) == null ? void 0 : _a.trim())) continue;
          rows.push({
            product_code: ((_b = cols[idx.code]) == null ? void 0 : _b.trim()) || "",
            description: ((_c = cols[idx.desc]) == null ? void 0 : _c.trim()) || "",
            notes: ((_d = cols[idx.notes]) == null ? void 0 : _d.trim()) || null,
            barcode: ((_e = cols[idx.barcode]) == null ? void 0 : _e.trim()) || null,
            unit_of_measure: ((_f = cols[idx.uom]) == null ? void 0 : _f.trim()) || null,
            min_stock: parseFloat(cols[idx.minStock]) || null,
            max_stock: parseFloat(cols[idx.maxStock]) || null,
            supplier_code: ((_g = cols[idx.supplierCode]) == null ? void 0 : _g.trim()) || null,
            supplier_name: ((_h = cols[idx.supplierName]) == null ? void 0 : _h.trim()) || null,
            supplier_product_code: ((_i = cols[idx.supplierProd]) == null ? void 0 : _i.trim()) || null,
            default_purchase_price: parseFloat(cols[idx.buyPrice]) || null,
            minimum_order_qty: parseFloat(cols[idx.minQty]) || null,
            product_group: ((_j = cols[idx.group]) == null ? void 0 : _j.trim()) || null,
            product_sub_group: ((_k = cols[idx.subGroup]) == null ? void 0 : _k.trim()) || null,
            product_brand: ((_l = cols[idx.brand]) == null ? void 0 : _l.trim()) || null,
            active: true,
            created_by: (_m = State.user) == null ? void 0 : _m.id
          });
        }
        if (!rows.length) {
          toast("No valid rows found in CSV");
          return;
        }
        let imported = 0;
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error } = await getClient().from("stock_items").upsert(batch, { onConflict: "product_code" });
          if (error) throw error;
          imported += batch.length;
        }
        toast(`\u2713 Imported ${imported} items`);
        loadStock("");
      } catch (e) {
        toast("Import failed: " + e.message);
        console.error(e);
      }
      input.value = "";
    };
  }
  async function loadStock(search) {
    const el = document.getElementById("stock-list");
    if (!el) return;
    try {
      let q = getClient().from("stock_items").select("*").eq("active", true).order("product_code").limit(100);
      if (search) q = q.or(`product_code.ilike.%${search}%,description.ilike.%${search}%,barcode.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      if (!(data == null ? void 0 : data.length)) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F4E6}</div>${search ? "No items match your search" : "No stock items yet \u2014 upload a CSV to get started"}</div>`;
        return;
      }
      el.innerHTML = data.map((item) => `
      <div class="card card-pad" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${item.description}</div>
          <div style="font-size:11px;font-family:var(--mono);color:var(--text3);margin-top:2px">${item.product_code}${item.barcode ? " \xB7 " + item.barcode : ""}</div>
          ${item.supplier_name ? `<div style="font-size:11px;color:var(--text3);margin-top:1px">${item.supplier_name}</div>` : ""}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${item.unit_of_measure ? `<div style="font-size:11px;color:var(--text3)">${item.unit_of_measure}</div>` : ""}
          ${item.default_purchase_price ? `<div style="font-size:12px;font-family:var(--mono);color:var(--text2)">\xA3${Number(item.default_purchase_price).toFixed(2)}</div>` : ""}
          <button class="btn btn-danger sm" style="margin-top:4px;font-size:11px;padding:3px 8px" onclick="window._stockDelete('${item.id}')">Remove</button>
        </div>
      </div>`).join("");
      window._stockDelete = async (id) => {
        if (!confirm("Remove this item from the catalogue?")) return;
        await getClient().from("stock_items").update({ active: false }).eq("id", id);
        toast("Item removed");
        loadStock(search);
      };
    } catch (e) {
      el.innerHTML = `<div class="empty-state">Error loading stock: ${e.message}</div>`;
    }
  }
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current);
    return result;
  }

  // pages/Admin.js
  init_state();
  init_utils();
  init_i18n();
  var t7 = (k) => i18n.t(k);
  var adminTab = "users";
  function renderAdmin() {
    const el = document.getElementById("tab-admin");
    if (!el || !State.isSupervisor) return;
    el.innerHTML = `<div class="page-pad">
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn ${adminTab === "users" ? "btn-primary" : "btn-secondary"} sm" onclick="window._adminTab('users')">${t7("users")}</button>
      <button class="btn ${adminTab === "products" ? "btn-primary" : "btn-secondary"} sm" onclick="window._adminTab('products')">${t7("products")}</button>
      <button class="btn ${adminTab === "stock" ? "btn-primary" : "btn-secondary"} sm" onclick="window._adminTab('stock')">\u{1F4E6} Stock catalogue</button>
    </div>
    <div id="admin-content"></div>
  </div>`;
    window._adminTab = (tab) => {
      adminTab = tab;
      renderAdmin();
    };
    if (adminTab === "users") renderUsers();
    else if (adminTab === "products") renderProducts();
    else if (adminTab === "stock") renderStockAdmin(document.getElementById("admin-content"));
  }
  async function renderUsers() {
    const el = document.getElementById("admin-content");
    el.innerHTML = `<div class="row-between">
    <div class="section-title" style="margin:0">${t7("users")}</div>
    <button class="btn btn-primary sm" onclick="window._inviteUser()">+ ${t7("inviteUser")}</button>
  </div>
  <div style="margin-top:10px" id="users-list"><div class="empty-state">Loading...</div></div>`;
    window._inviteUser = showInviteModal;
    try {
      const users = await Profiles.getAll();
      document.getElementById("users-list").innerHTML = users.map((u) => {
        var _a;
        return `
      <div class="admin-item">
        <div class="admin-avatar">${(u.display_name || "?")[0].toUpperCase()}</div>
        <div><div class="admin-name">${u.display_name}</div>
        <div class="admin-email">${u.email || ""} \xB7 ${t7(u.role || "operator")}${u.active === false ? ' \xB7 <span style="color:var(--red)">Inactive</span>' : ""}</div></div>
        <div class="admin-actions">
          ${u.id !== ((_a = State.user) == null ? void 0 : _a.id) ? `
          <button class="btn btn-ghost sm" onclick="window._toggleRole('${u.id}','${u.role}')">${u.role === "operator" ? "\u2192 Supervisor" : "\u2192 Operator"}</button>
          <button class="btn ${u.active === false ? "btn-success" : "btn-danger"} sm" onclick="window._toggleActive('${u.id}',${u.active !== false})">${u.active === false ? t7("reactivate") : t7("deactivate")}</button>` : '<span class="badge badge-info">You</span>'}
        </div>
      </div>`;
      }).join("");
      window._toggleRole = async (id, currentRole) => {
        try {
          await Profiles.update(id, { role: currentRole === "operator" ? "supervisor" : "operator" });
          renderAdmin();
          toast("Role updated");
        } catch (e) {
          toast(e.message);
        }
      };
      window._toggleActive = async (id, currentActive) => {
        try {
          await Profiles.update(id, { active: !currentActive });
          renderAdmin();
          toast(currentActive ? "User deactivated" : "User reactivated");
        } catch (e) {
          toast(e.message);
        }
      };
    } catch (e) {
      document.getElementById("users-list").innerHTML = `<div class="empty-state">Error loading users</div>`;
    }
  }
  function showInviteModal() {
    modal(`
    <div class="modal-title">${t7("inviteUser")}</div>
    <div style="background:var(--blue-bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;font-size:12px;color:var(--blue);margin-bottom:14px;line-height:1.5">
      Inviting users requires your Supabase <strong>service role key</strong>.<br>
      Find it: Supabase dashboard \u2192 Project Settings \u2192 API \u2192 <em>service_role secret</em>
    </div>
    <div class="field"><label>Service role key</label><input type="password" id="inv-svckey" placeholder="eyJ... (service_role key, not anon key)"></div>
    <div class="field"><label>${t7("displayName")}</label><input type="text" id="inv-name" placeholder="First Last"></div>
    <div class="field"><label>${t7("username")}</label><input type="text" id="inv-user" placeholder="firstname.lastname" autocapitalize="none"></div>
    <div class="field"><label>${t7("role")}</label>
      <select id="inv-role"><option value="operator">${t7("operator")}</option><option value="supervisor">${t7("supervisor")}</option></select>
    </div>
    <div class="field-hint" style="margin-bottom:12px">User will log in as <strong>username@caremed.internal</strong></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="window._closeModal()">${t7("cancel")}</button>
      <button class="btn btn-primary" onclick="window._sendInvite()">${t7("sendInvite")}</button>
    </div>`);
    window._closeModal = closeModal;
    window._sendInvite = async () => {
      const name = document.getElementById("inv-name").value.trim();
      const user = document.getElementById("inv-user").value.trim().toLowerCase().replace(/[^a-z0-9.]/g, "");
      const role = document.getElementById("inv-role").value;
      const svcKey = document.getElementById("inv-svckey").value.trim();
      if (!name || !user) {
        toast(t7("fillRequired"));
        return;
      }
      if (!svcKey) {
        toast("Service role key required \u2014 see instructions above");
        return;
      }
      const email = `${user}@caremed.internal`;
      try {
        const res = await fetch(`${window.__SB_URL__}/auth/v1/invite`, {
          method: "POST",
          headers: {
            "apikey": svcKey,
            "Authorization": `Bearer ${svcKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, data: { display_name: name, role, username: user } })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.msg || err.message || "Invite failed");
        }
        closeModal();
        toast(`\u2713 Invite sent to ${email}`);
        renderAdmin();
      } catch (e) {
        toast("Error: " + e.message);
      }
    };
  }
  async function renderProducts() {
    const el = document.getElementById("admin-content");
    el.innerHTML = `<div class="row-between">
    <div class="section-title" style="margin:0">${t7("products")}</div>
    <button class="btn btn-primary sm" onclick="window._newProduct()">+ New</button>
  </div>
  <div style="margin-top:10px" id="products-list"><div class="empty-state">Loading...</div></div>`;
    window._newProduct = () => openProductBuilder(null);
    try {
      const products = await Products.getAll();
      const pl = document.getElementById("products-list");
      if (!products.length) {
        pl.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F4E6}</div>No products yet</div>`;
        return;
      }
      pl.innerHTML = products.map((p) => `<div class="product-card" onclick="window._editProduct('${p.id}')">
      <div class="product-name">${p.name}</div>
      <div class="product-meta">${(p.stages || []).length} stages \xB7 ${p.description || ""}</div>
    </div>`).join("");
      window._editProduct = async (id) => {
        const p = await Products.get(id);
        openProductBuilder(p);
      };
    } catch (e) {
      document.getElementById("products-list").innerHTML = `<div class="empty-state">Error loading products</div>`;
    }
  }
  function openProductBuilder(product) {
    Promise.resolve().then(() => (init_ProductBuilder(), ProductBuilder_exports)).then((m) => m.renderProductBuilder(product));
  }

  // pages/App.js
  var t9 = (k) => i18n.t(k);
  function renderApp() {
    var _a;
    const isSup = State.isSupervisor;
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="offline-bar" id="offline-bar">${t9("offline")}</div>

    <div id="main-screen" class="screen active">
      <div class="topbar">
        <div class="topbar-inner">
          <div style="background:rgba(255,255,255,.12);width:auto;padding:0 10px;border-radius:8px;height:32px;display:flex;align-items:center">
            <span style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:13px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:-0.5px">med</span>
          </div>
          <div>
            <div class="topbar-title">${t9("appName")}</div>
            <div class="topbar-sub" id="topbar-user">${State.displayName} \xB7 ${t9(((_a = State.profile) == null ? void 0 : _a.role) || "operator")}</div>
          </div>
          <div class="topbar-actions">
            ${isSup ? `<button class="icon-btn" onclick="AppShell.switchTab('admin')" title="Admin">\u2699</button>` : ""}
            <button class="icon-btn" onclick="AppShell.showSignOut()" title="Sign out">\u21E5</button>
          </div>
        </div>
        <div class="tab-bar">
          <button class="tab active" data-tab="dashboard" onclick="AppShell.switchTab('dashboard')">${t9("dashboard")}</button>
          <button class="tab" data-tab="scheduler"        onclick="AppShell.switchTab('scheduler')">${t9("scheduler")}</button>
          <button class="tab" data-tab="builds"           onclick="AppShell.switchTab('builds')">${t9("builds")}</button>
          <button class="tab" data-tab="records"          onclick="AppShell.switchTab('records')">${t9("records")}</button>
          ${isSup ? `<button class="tab" data-tab="admin" onclick="AppShell.switchTab('admin')">${t9("admin")}</button>` : ""}
        </div>
      </div>
      <div id="tab-dashboard" class="tab-content active"></div>
      <div id="tab-scheduler" class="tab-content"></div>
      <div id="tab-builds"    class="tab-content"></div>
      <div id="tab-records"   class="tab-content"></div>
      ${isSup ? `<div id="tab-admin" class="tab-content"></div>` : ""}
    </div>

    <div id="build-screen"     class="screen slide-up"></div>
    <div id="slideshow-screen" class="screen slide-up"></div>
    <div id="form-screen"      class="screen slide-up"></div>
    <div id="product-screen"   class="screen slide-left"></div>

    <!-- Floating scan button -->
    <button onclick="window._openStockRequest()" title="Request stock"
      style="position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;background:var(--brand);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 16px rgba(58,58,127,.4);z-index:100">
      \u{1F4E6}
    </button>`;
    window.addEventListener("online", () => {
      document.getElementById("offline-bar").style.display = "none";
      AppShell.refresh();
    });
    window.addEventListener("offline", () => {
      document.getElementById("offline-bar").style.display = "block";
    });
    if (!navigator.onLine) document.getElementById("offline-bar").style.display = "block";
    State.setupRealtime(() => AppShell.refresh());
    window._openStockRequest = () => openStockRequest();
    window._srPurchaseEmail = localStorage.getItem("cm_purchase_email") || "purchasing@caremed-group.com";
    renderDashboard();
    window.AppShell = {
      switchTab(tab) {
        State.currentTab = tab;
        document.querySelectorAll(".tab").forEach((t10) => t10.classList.toggle("active", t10.dataset.tab === tab));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.toggle("active", c.id === `tab-${tab}`));
        AppShell.refresh();
      },
      refresh() {
        const tab = State.currentTab;
        if (tab === "dashboard") renderDashboard();
        else if (tab === "scheduler") renderScheduler();
        else if (tab === "builds") renderBuilds();
        else if (tab === "records") renderRecords();
        else if (tab === "admin") renderAdmin();
      },
      openScreen(id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.classList.contains("slide-up") || el.classList.contains("slide-left")) el.classList.add("open");
        else el.classList.add("active");
      },
      closeScreen(id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.classList.contains("slide-up") || el.classList.contains("slide-left")) el.classList.remove("open");
        else el.classList.remove("active");
        AppShell.refresh();
      },
      showSignOut() {
        Promise.resolve().then(() => (init_Settings(), Settings_exports)).then((m) => m.showSettingsModal());
      }
    };
  }

  // main.js
  init_i18n();
  var _booted = false;
  Auth.onAuthChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      _booted = true;
      showSetPasswordScreen();
      return;
    }
    if (event === "SIGNED_OUT") {
      State.user = null;
      State.profile = null;
      renderLogin(onLoginSuccess);
      return;
    }
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && (session == null ? void 0 : session.user)) {
      if (_booted) return;
      State.user = session.user;
      await State.loadProfile();
    }
  });
  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout:" + label)), ms))
    ]);
  }
  async function boot() {
    var _a;
    await new Promise((r) => setTimeout(r, 100));
    if (_booted) return;
    _booted = true;
    try {
      const session = await withTimeout(Auth.getSession(), 6e3, "getSession");
      if (session == null ? void 0 : session.user) {
        State.user = session.user;
        try {
          await withTimeout(State.loadProfile(), 6e3, "loadProfile");
        } catch (e) {
        }
        if (((_a = State.profile) == null ? void 0 : _a.active) === false) {
          await Auth.signOut();
          renderLogin(onLoginSuccess);
          return;
        }
        renderApp();
        return;
      }
    } catch (e) {
    }
    renderLogin(onLoginSuccess);
  }
  async function onLoginSuccess() {
    renderApp();
  }
  function showSetPasswordScreen() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="login-screen">
      <div style="background:rgba(255,255,255,.15);border-radius:16px;width:80px;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <div style="text-align:center;line-height:1">
          <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-1px">Care</span><span style="font-size:28px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:-1px">med</span>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:4px">
        <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:22px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:-0.5px">med</span>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:32px;margin-top:4px;letter-spacing:.5px;text-transform:uppercase">Healthcare Group</p>
      <div class="login-card">
        <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:6px">Set new password</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Choose a new password for your account.</div>
        <div id="setp-msg" style="display:none;border-radius:var(--r-sm);padding:10px 12px;font-size:13px;margin-bottom:12px"></div>
        <div class="field">
          <label>New password</label>
          <input type="password" id="setp-pw1" placeholder="Min. 8 characters" autocomplete="new-password">
        </div>
        <div class="field">
          <label>Confirm password</label>
          <input type="password" id="setp-pw2" placeholder="Repeat password" autocomplete="new-password">
        </div>
        <button class="btn btn-primary full" id="setp-btn" onclick="window._setNewPassword()">Set password & sign in</button>
      </div>
    </div>`;
    window._setNewPassword = async () => {
      const pw1 = document.getElementById("setp-pw1").value;
      const pw2 = document.getElementById("setp-pw2").value;
      const btn = document.getElementById("setp-btn");
      const msg = document.getElementById("setp-msg");
      const showErr = (text) => {
        msg.style.display = "block";
        msg.style.background = "var(--red-bg)";
        msg.style.color = "var(--red)";
        msg.style.border = "1px solid var(--red-light)";
        msg.textContent = text;
      };
      if (!pw1 || pw1.length < 8) {
        showErr("Password must be at least 8 characters.");
        return;
      }
      if (pw1 !== pw2) {
        showErr("Passwords do not match.");
        return;
      }
      btn.disabled = true;
      btn.textContent = "Saving...";
      try {
        const { getClient: getClient2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { data, error } = await getClient2().auth.updateUser({ password: pw1 });
        if (error) throw error;
        history.replaceState(null, "", window.location.pathname);
        msg.style.display = "block";
        msg.style.background = "var(--green-bg)";
        msg.style.color = "var(--green)";
        msg.style.border = "1px solid var(--green-light)";
        msg.textContent = "\u2713 Password updated! Signing you in...";
        setTimeout(async () => {
          State.user = data.user;
          await State.loadProfile();
          renderApp();
        }, 1e3);
      } catch (e) {
        showErr(e.message || "Something went wrong. Try requesting a new reset link.");
        btn.disabled = false;
        btn.textContent = "Set password & sign in";
      }
    };
    setTimeout(() => {
      var _a;
      (_a = document.getElementById("setp-pw2")) == null ? void 0 : _a.addEventListener("keydown", (e) => {
        if (e.key === "Enter") window._setNewPassword();
      });
    }, 100);
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((r) => r.forEach((sw) => sw.unregister()));
  }
  window.onerror = (msg, src, line, col, err) => {
    const app = document.getElementById("app");
    if (app && !app.innerHTML.trim()) {
      app.innerHTML = `<div style="padding:32px;font-family:sans-serif;background:#fdeaea;min-height:100vh">
      <div style="max-width:600px;margin:0 auto">
        <h2 style="color:#7a1f1f;margin-bottom:12px">App error</h2>
        <p style="color:#333;margin-bottom:8px">${msg}</p>
        <p style="color:#888;font-size:13px">${src} line ${line}</p>
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3A3A7F;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Reload</button>
      </div>
    </div>`;
    }
  };
  window.addEventListener("online", () => {
    const b = document.getElementById("offline-bar");
    if (b) b.style.display = "none";
  });
  window.addEventListener("offline", () => {
    const b = document.getElementById("offline-bar");
    if (b) b.style.display = "block";
  });
  boot().catch((err) => {
    console.error("Boot failed:", err);
    const app = document.getElementById("app");
    if (app) app.innerHTML = `<div style="padding:32px;font-family:sans-serif;background:#fdeaea;min-height:100vh">
    <div style="max-width:600px;margin:0 auto">
      <h2 style="color:#7a1f1f;margin-bottom:12px">Failed to start</h2>
      <p style="color:#333;margin-bottom:8px">${(err == null ? void 0 : err.message) || "Unknown error"}</p>
      <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3A3A7F;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Reload</button>
    </div>
  </div>`;
  });
})();
