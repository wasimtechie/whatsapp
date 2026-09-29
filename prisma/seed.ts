import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const contactsSeed = [
  {
    phoneE164: "+919876543210",
    profileName: "Priya Sharma",
    tags: ["lead", "mumbai"],
    categoryPerms: ["marketing", "utility"],
  },
  {
    phoneE164: "+919811122233",
    profileName: "Rahul Mehta",
    tags: ["customer", "vip"],
    categoryPerms: ["marketing", "utility", "authentication"],
  },
  {
    phoneE164: "+918765432109",
    profileName: "Ananya Iyer",
    tags: ["lead", "bengaluru"],
    categoryPerms: ["utility"],
  },
  {
    phoneE164: "+917001112233",
    profileName: "Vikram Singh",
    tags: ["support"],
    categoryPerms: ["utility"],
  },
  {
    phoneE164: "+919900112233",
    profileName: "Sneha Patel",
    tags: ["lead", "campaign"],
    categoryPerms: ["marketing"],
  },
  {
    phoneE164: "+918888777666",
    profileName: "Arjun Nair",
    tags: ["customer"],
    categoryPerms: ["marketing", "utility"],
  },
  {
    phoneE164: "+919555444333",
    profileName: "Meera Krishnan",
    tags: ["opt-out"],
    categoryPerms: [],
    suppressed: true,
    suppressedReason: "Customer replied STOP",
  },
  {
    phoneE164: "+917722334455",
    profileName: "Kabir Khan",
    tags: ["lead", "delhi"],
    categoryPerms: ["marketing", "utility"],
  },
];

async function seedWorkspace(workspaceId: string, displayName: string) {
  const number = await prisma.whatsAppAccount.upsert({
    where: {
      workspaceId_phoneNumberId: {
        workspaceId,
        phoneNumberId: `demo_phone_${workspaceId.slice(0, 8)}`,
      },
    },
    create: {
      workspaceId,
      phoneNumberId: `demo_phone_${workspaceId.slice(0, 8)}`,
      wabaId: `demo_waba_${workspaceId.slice(0, 8)}`,
      displayName,
      displayPhone: "+91 98765 00001",
      accessTokenEnc: "demo-token-not-for-production",
      webhookVerifyToken: `demo_verify_${workspaceId.slice(0, 8)}`,
      health: "CONNECTED",
      qualityRating: "GREEN",
      messagingLimit: "TIER_1K",
      webhookSubscribed: true,
      credentialRef: `demo:${workspaceId}`,
    },
    update: {
      health: "CONNECTED",
      displayPhone: "+91 98765 00001",
      qualityRating: "GREEN",
    },
  });

  const contactIds: string[] = [];
  for (const c of contactsSeed) {
    const contact = await prisma.contact.upsert({
      where: {
        workspaceId_phoneE164: {
          workspaceId,
          phoneE164: c.phoneE164,
        },
      },
      create: {
        workspaceId,
        phoneE164: c.phoneE164,
        profileName: c.profileName,
        tags: c.tags,
        categoryPerms: c.categoryPerms,
        source: "seed",
        consentSource: c.suppressed ? null : "web_form",
        consentAt: c.suppressed ? null : new Date(Date.now() - 7 * 86400000),
        consentEvidence: c.suppressed ? null : "seed-consent-v1",
        suppressed: c.suppressed ?? false,
        suppressedAt: c.suppressed ? new Date() : null,
        suppressedReason: c.suppressedReason,
      },
      update: {
        profileName: c.profileName,
        tags: c.tags,
        suppressed: c.suppressed ?? false,
      },
    });
    contactIds.push(contact.id);
  }

  const inboxThreads = [
    {
      contactIdx: 0,
      state: "OPEN" as const,
      messages: [
        {
          direction: "INBOUND" as const,
          body: "Hi, I saw your Diwali offer on Instagram. Is it still valid?",
          minutesAgo: 45,
        },
        {
          direction: "OUTBOUND" as const,
          body: "Hi Priya! Yes — the offer runs through Sunday. Want me to share the catalogue?",
          minutesAgo: 40,
          status: "READ" as const,
        },
        {
          direction: "INBOUND" as const,
          body: "Please share. Also do you ship to Mumbai same day?",
          minutesAgo: 12,
        },
      ],
    },
    {
      contactIdx: 1,
      state: "PENDING" as const,
      messages: [
        {
          direction: "INBOUND" as const,
          body: "Need a demo for our retail chain — 12 stores.",
          minutesAgo: 180,
        },
        {
          direction: "OUTBOUND" as const,
          body: "Thanks Rahul. I can do tomorrow 11am IST or 4pm IST — which works?",
          minutesAgo: 150,
          status: "DELIVERED" as const,
        },
      ],
    },
    {
      contactIdx: 3,
      state: "OPEN" as const,
      messages: [
        {
          direction: "INBOUND" as const,
          body: "My order #BI-2041 hasn't shipped yet.",
          minutesAgo: 90,
        },
        {
          direction: "OUTBOUND" as const,
          body: "Checking with logistics now — I'll update you in a few minutes.",
          minutesAgo: 85,
          status: "READ" as const,
        },
        {
          direction: "INBOUND" as const,
          body: "Okay, waiting.",
          minutesAgo: 80,
        },
      ],
    },
    {
      contactIdx: 5,
      state: "RESOLVED" as const,
      messages: [
        {
          direction: "INBOUND" as const,
          body: "Thanks, the replacement arrived today!",
          minutesAgo: 1440,
        },
        {
          direction: "OUTBOUND" as const,
          body: "Glad it's sorted, Arjun. Reach out anytime.",
          minutesAgo: 1430,
          status: "READ" as const,
        },
      ],
    },
    {
      contactIdx: 7,
      state: "OPEN" as const,
      messages: [
        {
          direction: "INBOUND" as const,
          body: "STOP",
          minutesAgo: 30,
        },
      ],
    },
  ];

  for (const thread of inboxThreads) {
    const contactId = contactIds[thread.contactIdx];
    const lastMsg = thread.messages[thread.messages.length - 1];
    const lastAt = new Date(Date.now() - lastMsg.minutesAgo * 60000);
    const lastCustomer = [...thread.messages]
      .reverse()
      .find((m) => m.direction === "INBOUND");

    const conversation = await prisma.conversation.upsert({
      where: {
        workspaceId_numberId_contactId: {
          workspaceId,
          numberId: number.id,
          contactId,
        },
      },
      create: {
        workspaceId,
        numberId: number.id,
        contactId,
        state: thread.state,
        labels: thread.state === "OPEN" ? ["priority"] : [],
        lastCustomerAt: lastCustomer
          ? new Date(Date.now() - lastCustomer.minutesAgo * 60000)
          : null,
        lastMessageAt: lastAt,
      },
      update: {
        state: thread.state,
        lastMessageAt: lastAt,
      },
    });

    await prisma.message.deleteMany({
      where: { conversationId: conversation.id },
    });

    for (const [i, msg] of thread.messages.entries()) {
      const createdAt = new Date(Date.now() - msg.minutesAgo * 60000);
      await prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          numberId: number.id,
          providerId: `seed_${conversation.id}_${i}`,
          direction: msg.direction,
          status:
            msg.direction === "INBOUND"
              ? "DELIVERED"
              : (msg.status ?? "SENT"),
          body: msg.body,
          idempotencyKey: `seed:${workspaceId}:${conversation.id}:${i}`,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
  }

  const welcomeTemplate = await prisma.template.upsert({
    where: {
      workspaceId_name_language: {
        workspaceId,
        name: "welcome_offer",
        language: "en",
      },
    },
    create: {
      workspaceId,
      name: "welcome_offer",
      language: "en",
      category: "MARKETING",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hi {{1}}, welcome to beyond impossible! Your offer code is {{2}}.",
        },
      ],
      providerId: "tpl_welcome_offer",
    },
    update: { status: "APPROVED" },
  });

  const reminderTemplate = await prisma.template.upsert({
    where: {
      workspaceId_name_language: {
        workspaceId,
        name: "cart_reminder",
        language: "en",
      },
    },
    create: {
      workspaceId,
      name: "cart_reminder",
      language: "en",
      category: "MARKETING",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hi {{1}}, you left items in your cart. Complete checkout today.",
        },
      ],
      providerId: "tpl_cart_reminder",
    },
    update: { status: "APPROVED" },
  });

  await prisma.campaign.deleteMany({ where: { workspaceId } });

  const campaign1 = await prisma.campaign.create({
    data: {
      workspaceId,
      numberId: number.id,
      templateId: welcomeTemplate.id,
      name: "Diwali welcome blast",
      status: "COMPLETED",
      timezone: "Asia/Kolkata",
      scheduledAt: new Date(Date.now() - 3 * 86400000),
      estimatedCost: 842.5,
      segmentSnapshot: { tags: ["lead"], count: 5 },
      variableMap: { "1": "name", "2": "DIWALI25" },
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      workspaceId,
      numberId: number.id,
      templateId: reminderTemplate.id,
      name: "Cart recovery — weekend",
      status: "SCHEDULED",
      timezone: "Asia/Kolkata",
      scheduledAt: new Date(Date.now() + 2 * 86400000),
      estimatedCost: 312.0,
      segmentSnapshot: { tags: ["customer"], count: 3 },
      variableMap: { "1": "name" },
    },
  });

  const campaign3 = await prisma.campaign.create({
    data: {
      workspaceId,
      numberId: number.id,
      templateId: welcomeTemplate.id,
      name: "New store launch — draft",
      status: "DRAFT",
      timezone: "Asia/Kolkata",
      estimatedCost: 0,
      segmentSnapshot: { tags: ["delhi"], count: 1 },
      variableMap: { "1": "name", "2": "LAUNCH10" },
    },
  });

  const recipientStatuses = [
    "DELIVERED",
    "READ",
    "FAILED",
    "SUPPRESSED",
    "QUEUED",
  ] as const;

  for (let i = 0; i < Math.min(5, contactIds.length); i++) {
    await prisma.campaignRecipient.create({
      data: {
        campaignId: campaign1.id,
        contactId: contactIds[i],
        status: recipientStatuses[i],
        sentAt: new Date(Date.now() - 3 * 86400000),
        failureReason: i === 2 ? "Template parameter mismatch" : null,
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    await prisma.campaignRecipient.create({
      data: {
        campaignId: campaign2.id,
        contactId: contactIds[i + 1],
        status: "QUEUED",
      },
    });
  }

  await prisma.campaignRecipient.create({
    data: {
      campaignId: campaign3.id,
      contactId: contactIds[7],
      status: "QUEUED",
    },
  });

  await prisma.usageLedger.createMany({
    data: [
      {
        workspaceId,
        kind: "message.outbound",
        quantity: 128,
        amountInr: 640,
        meta: { source: "seed" },
      },
      {
        workspaceId,
        kind: "message.inbound",
        quantity: 96,
        meta: { source: "seed" },
      },
    ],
  });
}

async function ensureDemoUser() {
  const passwordHash = await bcrypt.hash("demo12345", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@beyondimpossible.test" },
    create: {
      email: "demo@beyondimpossible.test",
      name: "Demo User",
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          inviteState: "ACCEPTED",
          workspace: {
            create: {
              name: "Demo Workspace",
              slug: "demo-workspace",
              plan: "trial",
              region: "in",
              locale: "en-IN",
              timezone: "Asia/Kolkata",
              subscription: {
                create: {
                  plan: "trial",
                  seats: 3,
                  numbersLimit: 1,
                  status: "trialing",
                },
              },
            },
          },
        },
      },
    },
    update: {},
    include: { memberships: true },
  });

  return user.memberships[0]?.workspaceId;
}

async function main() {
  const demoWorkspaceId = await ensureDemoUser();

  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });

  for (const ws of workspaces) {
    console.log(`Seeding workspace: ${ws.name} (${ws.id})`);
    await seedWorkspace(ws.id, ws.name);
  }

  if (!demoWorkspaceId) {
    console.warn("Demo workspace missing after ensure");
  }

  console.log(`Seeded ${workspaces.length} workspace(s).`);
  console.log("Login: demo@beyondimpossible.test / demo12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
