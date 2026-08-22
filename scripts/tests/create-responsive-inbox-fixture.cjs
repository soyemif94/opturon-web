const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const source = require("../../data/saas.json");
const data = JSON.parse(JSON.stringify(source));
const baseConversation = data.conversations[0];
const baseContact = data.contacts.find((contact) => contact.id === baseConversation.contactId) || data.contacts[0];
const baseMessages = data.messages.filter((message) => message.conversationId === baseConversation.id);
const now = Date.now();

data.users.push({
  id: "qa_responsive_user",
  email: "local-audit@opturon.test",
  name: "Local QA",
  globalRole: "ops_admin",
  passwordHash: "provided_by_local_test_environment",
  createdAt: new Date(now).toISOString()
});
data.memberships.push({
  id: "qa_responsive_membership",
  userId: "qa_responsive_user",
  tenantId: baseConversation.tenantId,
  role: "owner",
  createdAt: new Date(now).toISOString()
});

for (let index = 1; index <= 28; index += 1) {
  const contactId = `qa_contact_${index}`;
  const conversationId = `qa_conversation_${index}`;
  data.contacts.push({
    ...baseContact,
    id: contactId,
    name: `Contacto QA ${String(index).padStart(2, "0")}`,
    phone: `+549291500${String(index).padStart(4, "0")}`
  });
  data.conversations.push({
    ...baseConversation,
    id: conversationId,
    contactId,
    lastMessageAt: new Date(now - index * 60_000).toISOString(),
    priority: index % 4 === 0 ? "hot" : "normal"
  });
  const messageCount = index === 1 ? 42 : 3;
  for (let messageIndex = 0; messageIndex < messageCount; messageIndex += 1) {
    const template = baseMessages[messageIndex % Math.max(baseMessages.length, 1)] || data.messages[0];
    data.messages.push({
      ...template,
      id: `qa_message_${index}_${messageIndex}`,
      conversationId,
      direction: messageIndex % 2 === 0 ? "inbound" : "outbound",
      text: `Mensaje QA ${messageIndex + 1} de la conversación ${index}`,
      timestamp: new Date(now - (messageCount - messageIndex) * 60_000).toISOString()
    });
  }
}

const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "opturon-responsive-phase1b-"));
fs.writeFileSync(path.join(fixtureDirectory, "saas.json"), JSON.stringify(data, null, 2));
process.stdout.write(fixtureDirectory);
