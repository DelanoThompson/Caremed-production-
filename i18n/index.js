// i18n/index.js — English strings
const en = {
  appName:          'Production',
  offline:          '⚠ Offline — changes will sync when reconnected',

  // Nav
  dashboard:        'Dashboard',
  scheduler:        'Scheduler',
  builds:           'Builds',
  records:          'Records',
  admin:            'Admin',

  // Roles
  operator:         'Operator',
  supervisor:       'Supervisor',

  // Login
  loginSub:         'Sign in to your production account',
  username:         'Username',
  password:         'Password',
  signIn:           'Sign in',
  invalidCredentials: 'Incorrect username or password',

  // Dashboard
  scheduledToday:   'Scheduled today',
  inProgress:       'In progress',
  completedToday:   'Completed today',
  onHold:           'On hold',
  liveBuilds:       'Live builds',
  todaySchedule:    "Today's schedule",
  noActiveBuilds:   'No active builds',
  noJobsToday:      'No jobs scheduled today',
  noSerial:         '—',
  transferRequest:  'Transfer request',
  approve:          'Approve',
  decline:          'Decline',

  // Status labels / badges
  scheduled:        'Scheduled',
  inProgressBadge:  'In progress',
  complete:         'Complete',
  hold:             'On hold',

  // Builds
  activeBuilds:     'Active builds',
  completedToday2:  'Completed today',
  noBuilds:         'No builds',
  requestTransfer:  'Request transfer',
  errorSaving:      'Error saving: ',
  errorLoading:     'Error loading: ',
  transferRequested:'Transfer requested',
  workOrder:        'Work order',
  model:            'Model',
  serialNo:         'Serial no.',
  assignedOperator: 'Assigned operator',
  scheduledDate:    'Scheduled date',
  qcForms:          'QC forms',
  continueStepByStep: 'Continue step-by-step',
  assemblyQC:       'Assembly QC',
  preDelivery:      'Pre-delivery inspection',
  goodsIn:          'Goods in inspection',
  repairRework:     'Repair / Rework',
  assemblyQCSub:    'Torque checks, visual inspection, sign-off',
  comingSoon:       'Coming soon',
  pending:          'Pending',

  // Records
  qcRecords:        'QC records',
  searchRecords:    'Search by serial, work order, operator...',
  noRecords:        'No QC records yet',
  submitted:        'Submitted',

  // Admin
  users:            'Users',
  products:         'Products',
  inviteUser:       'Invite user',
  email:            'Email',
  displayName:      'Display name',
  role:             'Role',
  cancel:           'Cancel',
  sendInvite:       'Send invite',
  fillRequired:     'Please fill in all required fields',
  inviteSent:       'Invite sent — user can now set their password',
  reactivate:       'Reactivate',
  deactivate:       'Deactivate',

  // Settings
  settings:         'Settings',
  close:            'Close',
  signOut:          'Sign out',
}

export const i18n = {
  t(key) { return en[key] ?? key },
}
