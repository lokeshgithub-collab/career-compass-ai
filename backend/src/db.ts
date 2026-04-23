import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

type DB = {
  jobs: any[];
  applications: any[];
  chats: any[];
  resumes: any[];
  users: any[];
  posts: any[];
  comments: any[];
  connections: any[];
  groups: any[];
  groupMembers: any[];
  messages: any[];
  notifications: any[];
  bronzeJobs: any[];
  silverJobs: any[];
  goldJobs: any[];
  featureSnapshots: any[];
  eventLogs: any[];
  pipelineRuns: any[];
  interviewSessions: any[];
  alertEvents: any[];
  portfolioReports: any[];
  questionnaireResponses: any[];
  careerRecommendations: any[];
  roadmaps: any[];
  weeklyCheckIns: any[];
  placementOutcomes: any[];
  simulationRuns: any[];
  authOtps: any[];
};

function readDB(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DB>;
    return {
      jobs: parsed.jobs || [],
      applications: parsed.applications || [],
      chats: parsed.chats || [],
      resumes: parsed.resumes || [],
      users: parsed.users || [],
      posts: parsed.posts || [],
      comments: parsed.comments || [],
      connections: parsed.connections || [],
      groups: parsed.groups || [],
      groupMembers: parsed.groupMembers || [],
      messages: parsed.messages || [],
      notifications: parsed.notifications || [],
      bronzeJobs: parsed.bronzeJobs || [],
      silverJobs: parsed.silverJobs || [],
      goldJobs: parsed.goldJobs || [],
      featureSnapshots: parsed.featureSnapshots || [],
      eventLogs: parsed.eventLogs || [],
      pipelineRuns: parsed.pipelineRuns || [],
      interviewSessions: parsed.interviewSessions || [],
      alertEvents: parsed.alertEvents || [],
      portfolioReports: parsed.portfolioReports || [],
      questionnaireResponses: parsed.questionnaireResponses || [],
      careerRecommendations: parsed.careerRecommendations || [],
      roadmaps: parsed.roadmaps || [],
      weeklyCheckIns: parsed.weeklyCheckIns || [],
      placementOutcomes: parsed.placementOutcomes || [],
      simulationRuns: parsed.simulationRuns || [],
      authOtps: parsed.authOtps || [],
    };
  } catch (err) {
    const init: DB = {
      jobs: [],
      applications: [],
      chats: [],
      resumes: [],
      users: [],
      posts: [],
      comments: [],
      connections: [],
      groups: [],
      groupMembers: [],
      messages: [],
      notifications: [],
      bronzeJobs: [],
      silverJobs: [],
      goldJobs: [],
      featureSnapshots: [],
      eventLogs: [],
      pipelineRuns: [],
      interviewSessions: [],
      alertEvents: [],
      portfolioReports: [],
      questionnaireResponses: [],
      careerRecommendations: [],
      roadmaps: [],
      weeklyCheckIns: [],
      placementOutcomes: [],
      simulationRuns: [],
      authOtps: [],
    };
    writeDB(init);
    return init;
  }
}

function writeDB(db: DB) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function getJobs() {
  const db = readDB();
  return db.jobs;
}

export function addJob(job: any) {
  const db = readDB();
  db.jobs.unshift(job);
  writeDB(db);
  return job;
}

export function getApplications() {
  const db = readDB();
  return db.applications;
}

export function addApplication(app: any) {
  const db = readDB();
  db.applications.unshift(app);
  writeDB(db);
  return app;
}

export function addChat(chat: any) {
  const db = readDB();
  db.chats.push(chat);
  writeDB(db);
  return chat;
}

export function addResume(resume: any) {
  const db = readDB();
  db.resumes.unshift(resume);
  writeDB(db);
  return resume;
}

export function seedJobsIfEmpty(seedJobs: any[]) {
  const db = readDB();
  if (!db.jobs || db.jobs.length === 0) {
    db.jobs = seedJobs;
    writeDB(db);
  }
}

export function getUsers() {
  const db = readDB();
  return db.users;
}

export function getUserByEmail(email: string) {
  const db = readDB();
  return db.users.find((u: any) => String(u.email || '').toLowerCase() === String(email || '').toLowerCase()) || null;
}

export function upsertUser(user: any) {
  const db = readDB();
  const idx = db.users.findIndex((u: any) => u.id === user.id || (user.email && String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase()));
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...user };
  } else {
    db.users.push(user);
  }
  writeDB(db);
  return user;
}

export function getQuestionnaireResponses() {
  return readDB().questionnaireResponses;
}

export function addQuestionnaireResponse(response: any) {
  const db = readDB();
  db.questionnaireResponses.unshift(response);
  db.questionnaireResponses = db.questionnaireResponses.slice(0, 1000);
  writeDB(db);
  return response;
}

export function getCareerRecommendations() {
  return readDB().careerRecommendations;
}

export function saveCareerRecommendations(rows: any[]) {
  const db = readDB();
  db.careerRecommendations = rows;
  writeDB(db);
  return rows;
}

export function getRoadmaps() {
  return readDB().roadmaps;
}

export function saveRoadmap(roadmap: any) {
  const db = readDB();
  const idx = db.roadmaps.findIndex((r: any) => r.userId === roadmap.userId && r.career === roadmap.career);
  if (idx >= 0) {
    db.roadmaps[idx] = roadmap;
  } else {
    db.roadmaps.push(roadmap);
  }
  writeDB(db);
  return roadmap;
}

export function getPosts() {
  const db = readDB();
  return db.posts;
}

export function addPost(post: any) {
  const db = readDB();
  db.posts.unshift(post);
  writeDB(db);
  return post;
}

export function getComments() {
  const db = readDB();
  return db.comments;
}

export function addComment(comment: any) {
  const db = readDB();
  db.comments.push(comment);
  writeDB(db);
  return comment;
}

export function getConnections() {
  const db = readDB();
  return db.connections;
}

export function toggleConnection(fromId: string, toId: string) {
  const db = readDB();
  const idx = db.connections.findIndex((c: any) => c.fromId === fromId && c.toId === toId);
  if (idx >= 0) {
    db.connections.splice(idx, 1);
    writeDB(db);
    return { connected: false };
  }
  db.connections.push({ id: `conn_${Date.now()}`, fromId, toId, createdAt: new Date().toISOString() });
  writeDB(db);
  return { connected: true };
}

export function getGroups() {
  const db = readDB();
  return db.groups;
}

export function addGroup(group: any) {
  const db = readDB();
  db.groups.push(group);
  writeDB(db);
  return group;
}

export function getGroupMembers() {
  const db = readDB();
  return db.groupMembers;
}

export function joinGroup(groupId: string, userId: string) {
  const db = readDB();
  const exists = db.groupMembers.some((g: any) => g.groupId === groupId && g.userId === userId);
  if (!exists) {
    db.groupMembers.push({ id: `gm_${Date.now()}`, groupId, userId, joinedAt: new Date().toISOString() });
    writeDB(db);
  }
  return { joined: true };
}

export function getMessages() {
  const db = readDB();
  return db.messages;
}

export function addMessage(message: any) {
  const db = readDB();
  db.messages.push(message);
  writeDB(db);
  return message;
}

export function getNotifications() {
  const db = readDB();
  return db.notifications;
}

export function addNotification(notification: any) {
  const db = readDB();
  db.notifications.unshift(notification);
  writeDB(db);
  return notification;
}

export function markNotificationsRead(userId: string) {
  const db = readDB();
  db.notifications = db.notifications.map((n: any) =>
    n.userId === userId ? { ...n, read: true } : n
  );
  writeDB(db);
  return { ok: true };
}

export function saveBronzeJobs(rows: any[]) {
  const db = readDB();
  db.bronzeJobs = rows;
  writeDB(db);
  return rows;
}

export function saveSilverJobs(rows: any[]) {
  const db = readDB();
  db.silverJobs = rows;
  writeDB(db);
  return rows;
}

export function saveGoldJobs(rows: any[]) {
  const db = readDB();
  db.goldJobs = rows;
  db.jobs = rows;
  writeDB(db);
  return rows;
}

export function getBronzeJobs() {
  return readDB().bronzeJobs;
}

export function getSilverJobs() {
  return readDB().silverJobs;
}

export function getGoldJobs() {
  return readDB().goldJobs;
}

export function saveFeatureSnapshots(rows: any[]) {
  const db = readDB();
  db.featureSnapshots = rows;
  writeDB(db);
  return rows;
}

export function getFeatureSnapshots() {
  return readDB().featureSnapshots;
}

export function addEventLog(event: any) {
  const db = readDB();
  db.eventLogs.unshift(event);
  db.eventLogs = db.eventLogs.slice(0, 5000);
  writeDB(db);
  return event;
}

export function getEventLogs() {
  return readDB().eventLogs;
}

export function addPipelineRun(run: any) {
  const db = readDB();
  db.pipelineRuns.unshift(run);
  db.pipelineRuns = db.pipelineRuns.slice(0, 200);
  writeDB(db);
  return run;
}

export function getPipelineRuns() {
  return readDB().pipelineRuns;
}

export function addInterviewSession(session: any) {
  const db = readDB();
  db.interviewSessions.unshift(session);
  db.interviewSessions = db.interviewSessions.slice(0, 500);
  writeDB(db);
  return session;
}

export function getInterviewSessions() {
  return readDB().interviewSessions;
}

export function updateInterviewSession(id: string, patch: any) {
  const db = readDB();
  const idx = db.interviewSessions.findIndex((s: any) => s.id === id);
  if (idx === -1) return null;
  db.interviewSessions[idx] = { ...db.interviewSessions[idx], ...patch };
  writeDB(db);
  return db.interviewSessions[idx];
}

export function addAlertEvent(alert: any) {
  const db = readDB();
  db.alertEvents.unshift(alert);
  db.alertEvents = db.alertEvents.slice(0, 1000);
  writeDB(db);
  return alert;
}

export function getAlertEvents() {
  return readDB().alertEvents;
}

export function addPortfolioReport(report: any) {
  const db = readDB();
  db.portfolioReports.unshift(report);
  db.portfolioReports = db.portfolioReports.slice(0, 300);
  writeDB(db);
  return report;
}

export function getPortfolioReports() {
  return readDB().portfolioReports;
}

export function getWeeklyCheckIns() {
  return readDB().weeklyCheckIns;
}

export function addWeeklyCheckIn(entry: any) {
  const db = readDB();
  db.weeklyCheckIns.unshift(entry);
  db.weeklyCheckIns = db.weeklyCheckIns.slice(0, 1000);
  writeDB(db);
  return entry;
}

export function getPlacementOutcomes() {
  return readDB().placementOutcomes;
}

export function addPlacementOutcome(entry: any) {
  const db = readDB();
  db.placementOutcomes.unshift(entry);
  db.placementOutcomes = db.placementOutcomes.slice(0, 1000);
  writeDB(db);
  return entry;
}

export function getSimulationRuns() {
  return readDB().simulationRuns;
}

export function addSimulationRun(entry: any) {
  const db = readDB();
  db.simulationRuns.unshift(entry);
  db.simulationRuns = db.simulationRuns.slice(0, 1000);
  writeDB(db);
  return entry;
}

export function getAuthOtps() {
  return readDB().authOtps;
}

export function saveAuthOtp(entry: any) {
  const db = readDB();
  db.authOtps = [
    entry,
    ...db.authOtps.filter((item: any) => !(item.email === entry.email && item.purpose === entry.purpose)),
  ].slice(0, 1000);
  writeDB(db);
  return entry;
}

export function deleteAuthOtp(email: string, purpose?: string) {
  const db = readDB();
  db.authOtps = db.authOtps.filter((item: any) => {
    const sameEmail = String(item.email || '').toLowerCase() === String(email || '').toLowerCase();
    const samePurpose = purpose ? item.purpose === purpose : true;
    return !(sameEmail && samePurpose);
  });
  writeDB(db);
}
