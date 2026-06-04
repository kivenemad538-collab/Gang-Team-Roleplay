require("dotenv").config();
const express = require("express");

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const app = express();
app.get("/", (req, res) => res.send("Gang Application Bot Online"));
app.listen(process.env.PORT || 3000);

/* =========================
   عدل كل الأيديهات من هنا
========================= */

const CONFIG = {
  GUILD_ID: "PUT_SERVER_ID_HERE",

  APPLY_CHANNEL_ID: "PUT_APPLICATION_CHANNEL_ID_HERE",
  REVIEW_CHANNEL_ID: "PUT_REVIEW_CHANNEL_ID_HERE",
  WELCOME_CHANNEL_ID: "PUT_WELCOME_CHANNEL_ID_HERE",
  NEWS_CHANNEL_ID: "PUT_NEWS_CHANNEL_ID_HERE",
  LOG_CHANNEL_ID: "PUT_LOG_CHANNEL_ID_HERE",
  INTERVIEW_CATEGORY_ID: "PUT_INTERVIEW_CATEGORY_ID_HERE",

  AUTO_ROLE_ID: "PUT_AUTO_ROLE_ID_HERE",
  ACCEPTED_GANG_ROLE_ID: "PUT_ACCEPTED_GANG_ROLE_ID_HERE",

  STAFF_ROLE_IDS: [
    "PUT_STAFF_ROLE_ID_HERE"
  ],

  REVIEWER_ROLE_IDS: [
    "PUT_REVIEWER_ROLE_ID_HERE"
  ],

  BROADCAST_ROLE_ID: "PUT_ROLE_THAT_RECEIVES_NEWS_DM_HERE",

  SERVER_NAME: "Dark Gang",
  SYSTEM_NAME: "Dark Gang Application System",

  MAIN_COLOR: 0xff0000,
  SUCCESS_COLOR: 0x00ff7f,
  ERROR_COLOR: 0xff0000,

  APPLY_IMAGE: "PUT_IMAGE_LINK_HERE",
  RECEIVED_IMAGE: "PUT_IMAGE_LINK_HERE",
  ACCEPT_IMAGE: "PUT_IMAGE_LINK_HERE",
  REJECT_IMAGE: "PUT_IMAGE_LINK_HERE",
  WELCOME_IMAGE: "PUT_IMAGE_LINK_HERE",

  INTERVIEW_BUTTON_LABEL: "دخول المقابلة الصوتية 🎤"
};

const QUESTIONS = [
  "ما اسمك الحقيقي؟",
  "كم عمرك؟",
  "ما اسم شخصيتك داخل الرول بلاي؟",
  "هل لديك خبرة رول بلاي؟",
  "ما معنى Fail RP؟",
  "ما معنى Meta Gaming؟",
  "ما معنى Power Gaming؟",
  "ما معنى Random Deathmatch؟",
  "كيف تتصرف إذا خطفت شخص؟",
  "كيف تتصرف إذا خسرت سيناريو؟",
  "كم ساعة تلعب يومياً؟",
  `لماذا تريد الانضمام إلى ${CONFIG.SERVER_NAME}؟`
];

/* ========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const activeApplications = new Map();
const pendingApplications = new Map();
let applicationPanelSent = false;

function line() {
  return "━━━━━━━━━━━━━━━━━━━━";
}

function staffMentions() {
  return CONFIG.STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(" ");
}

function isReviewer(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return CONFIG.REVIEWER_ROLE_IDS.some(id => member.roles.cache.has(id));
}

async function sendLog(guild, text) {
  const ch = await guild.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.MAIN_COLOR)
        .setTitle("📌 System Log")
        .setDescription(text)
        .setTimestamp()
    ]
  }).catch(() => null);
}

function applyPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("التقديم على العصابة 📩")
    .setDescription(
      [
        line(),
        "",
        "أهلاً بك في نظام التقديم الرسمي",
        "",
        "📌 سيتم سؤالك عدة أسئلة",
        "يرجى الإجابة بجدية",
        "",
        "❌ إذا أردت إلغاء التقديم في أي وقت قم بكتابة:",
        "`cancel`",
        "",
        line()
      ].join("\n")
    )
    .setImage(CONFIG.APPLY_IMAGE)
    .setFooter({ text: `${CONFIG.SERVER_NAME} • نظام التقديم` });
}

function applyButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_gang_apply")
      .setLabel("تقديم العصابة 📩")
      .setStyle(ButtonStyle.Danger)
  );
}

function questionEmbed(step) {
  return new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle(`السؤال رقم ${step + 1}`)
    .setDescription(QUESTIONS[step])
    .setFooter({ text: "اكتب cancel لإلغاء التقديم" });
}

function receivedEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.SUCCESS_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("تم استلام تقديمك ✅")
    .setDescription(
      [
        line(),
        "",
        "تم إرسال تقديمك للإدارة",
        "وسيتم مراجعته قريباً",
        "",
        "نتمنى لك التوفيق ❤️",
        "",
        line()
      ].join("\n")
    )
    .setImage(CONFIG.RECEIVED_IMAGE)
    .setFooter({ text: `${CONFIG.SERVER_NAME} • نظام التقديم` });
}

function reviewEmbed(user, answers) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle("📥 تقديم عصابة جديد")
    .setDescription(
      [
        `👤 المتقدم: ${user}`,
        `🆔 ID: \`${user.id}\``,
        line()
      ].join("\n")
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: "قبول أو رفض التقديم من الأزرار بالأسفل" });

  answers.forEach((answer, i) => {
    embed.addFields({
      name: `السؤال رقم ${i + 1}`,
      value: `**${QUESTIONS[i]}**\n\`\`\`\n${String(answer).slice(0, 900)}\n\`\`\``
    });
  });

  return embed;
}

function reviewButtons(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${userId}`)
      .setLabel("قبول")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`reject_${userId}`)
      .setLabel("رفض بسبب")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );
}

function acceptedEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.SUCCESS_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("تم قبول طلبك في السيرفر! 🎉")
    .setDescription(
      [
        line(),
        "",
        "✅ تهانينا!",
        "",
        `تم قبولك مبدئياً في **${CONFIG.SERVER_NAME}**`,
        "",
        "أصبحت الآن مؤهلاً للدخول إلى المقابلة الصوتية",
        "",
        "يرجى الالتزام بالقوانين واحترام جميع اللاعبين",
        "",
        "📌 اضغط الزر بالأسفل للدخول إلى المقابلة الصوتية",
        "",
        line()
      ].join("\n")
    )
    .setImage(CONFIG.ACCEPT_IMAGE)
    .setFooter({ text: `${CONFIG.SERVER_NAME} • الإدارة` });
}

function interviewButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("create_interview")
      .setLabel(CONFIG.INTERVIEW_BUTTON_LABEL)
      .setStyle(ButtonStyle.Primary)
  );
}

function rejectedEmbed(reason) {
  return new EmbedBuilder()
    .setColor(CONFIG.ERROR_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("تم رفض تقديمك ❌")
    .setDescription(
      [
        line(),
        "",
        "للأسف تم رفض تقديمك",
        "",
        "**السبب:**",
        `\`\`\`\n${reason}\n\`\`\``,
        "",
        line()
      ].join("\n")
    )
    .setImage(CONFIG.REJECT_IMAGE)
    .setFooter({ text: `${CONFIG.SERVER_NAME} • نظام التقديم` });
}

function welcomeEmbed(member, inviteInfo = "غير معروف") {
  return new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle(`مرحباً بك في ${CONFIG.SERVER_NAME}! 🎉`)
    .setDescription(
      [
        `انضم ${member} إلى السيرفر`,
        "",
        `نتمنى لك وقتاً ممتعاً في ${CONFIG.SERVER_NAME} ✨`,
        "",
        "سيرفر FiveM متقدم ومميز 🎮",
        "",
        "يرجى قراءة القوانين جيداً قبل البدء 📜",
        "",
        "لا تتردد في التواصل مع الإدارة عند الحاجة 💬",
        "",
        `أنت العضو رقم 🎯`,
        `#${member.guild.memberCount}`,
        "",
        "عدد الأعضاء 👥",
        `${member.guild.memberCount} عضو`,
        "",
        "العضو 👤",
        `${member}`,
        "",
        "نوع السيرفر 🎮",
        "FiveM Server",
        "",
        "عمر الحساب 🗓️",
        `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        "",
        "تاريخ الانضمام 📅",
        `<t:${Math.floor(Date.now() / 1000)}:R>`,
        "",
        "الدعوة بواسطة 🎟️",
        inviteInfo
      ].join("\n")
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage(CONFIG.WELCOME_IMAGE)
    .setFooter({ text: `${CONFIG.SERVER_NAME} • Member #${member.guild.memberCount}` });
}

async function sendApplyPanel() {
  if (applicationPanelSent) return;

  const guild = await client.guilds.fetch(CONFIG.GUILD_ID).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(CONFIG.APPLY_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  if (messages) {
    const oldPanel = messages.find(
      m =>
        m.author.id === client.user.id &&
        m.embeds[0]?.title?.includes("التقديم على العصابة")
    );

    if (oldPanel) {
      applicationPanelSent = true;
      return;
    }
  }

  await channel.send({
    embeds: [applyPanelEmbed()],
    components: [applyButtonRow()]
  });

  applicationPanelSent = true;
}

async function askQuestion(user) {
  const data = activeApplications.get(user.id);
  if (!data) return;

  await user.send({
    embeds: [questionEmbed(data.step)]
  });
}

async function createInterviewChannel(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;

  const existing = guild.channels.cache.find(
    ch => ch.name === `interview-${member.user.username.toLowerCase()}`
  );

  if (existing) {
    return interaction.reply({
      content: `عندك روم مقابلة موجود بالفعل: ${existing}`,
      ephemeral: true
    });
  }

  const channel = await guild.channels.create({
    name: `interview-${member.user.username}`,
    type: ChannelType.GuildVoice,
    parent: CONFIG.INTERVIEW_CATEGORY_ID || null,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect
        ]
      },
      {
        id: member.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak
        ]
      },
      ...CONFIG.REVIEWER_ROLE_IDS.map(roleId => ({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.MoveMembers
        ]
      }))
    ]
  });

  await sendLog(guild, `🎤 تم إنشاء روم مقابلة للعضو ${member}: ${channel}`);

  return interaction.reply({
    content: `تم إنشاء روم المقابلة: ${channel}`,
    ephemeral: true
  });
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await sendApplyPanel();
});

client.on("guildMemberAdd", async member => {
  if (CONFIG.AUTO_ROLE_ID) {
    await member.roles.add(CONFIG.AUTO_ROLE_ID).catch(() => null);
  }

  const channel = await member.guild.channels.fetch(CONFIG.WELCOME_CHANNEL_ID).catch(() => null);

  if (channel) {
    await channel.send({
      content: `${member}`,
      embeds: [welcomeEmbed(member)]
    }).catch(() => null);
  }

  await sendLog(member.guild, `📥 دخل عضو جديد: ${member}`);
});

client.on("guildMemberRemove", async member => {
  await sendLog(member.guild, `📤 خرج عضو: ${member.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (!message.guild) {
    const userId = message.author.id;

    if (message.content.toLowerCase().trim() === "cancel") {
      if (activeApplications.has(userId)) {
        activeApplications.delete(userId);
        return message.reply("تم إلغاء التقديم بنجاح ❌");
      }

      return message.reply("لا يوجد تقديم شغال لديك حالياً.");
    }

    const data = activeApplications.get(userId);
    if (!data) return;

    data.answers.push(message.content.trim());
    data.step++;

    if (data.step < QUESTIONS.length) {
      activeApplications.set(userId, data);
      return askQuestion(message.author);
    }

    activeApplications.delete(userId);

    const guild = await client.guilds.fetch(data.guildId).catch(() => null);
    if (!guild) return message.reply("حدث خطأ في إرسال التقديم.");

    const reviewChannel = await guild.channels.fetch(CONFIG.REVIEW_CHANNEL_ID).catch(() => null);
    if (!reviewChannel) return message.reply("روم المراجعة غير موجود.");

    const sent = await reviewChannel.send({
      content: `${staffMentions()} تقديم جديد من ${message.author}`,
      embeds: [reviewEmbed(message.author, data.answers)],
      components: [reviewButtons(userId)]
    });

    pendingApplications.set(userId, {
      answers: data.answers,
      guildId: data.guildId,
      messageId: sent.id
    });

    await message.reply({
      embeds: [receivedEmbed()]
    });

    await sendLog(guild, `📨 تم إرسال تقديم جديد من ${message.author}`);

    return;
  }

  if (message.content.startsWith("!news ")) {
    if (!isReviewer(message.member)) return;

    const text = message.content.replace("!news ", "").trim();
    if (!text) return message.reply("اكتب الخبر بعد الأمر.");

    const newsChannel = await message.guild.channels.fetch(CONFIG.NEWS_CHANNEL_ID).catch(() => null);
    if (!newsChannel) return message.reply("روم الأخبار غير موجود.");

    const embed = new EmbedBuilder()
      .setColor(CONFIG.MAIN_COLOR)
      .setTitle("📢 خبر جديد")
      .setDescription(text)
      .setImage(CONFIG.APPLY_IMAGE)
      .setTimestamp()
      .setFooter({ text: CONFIG.SERVER_NAME });

    await newsChannel.send({ embeds: [embed] });

    const role = await message.guild.roles.fetch(CONFIG.BROADCAST_ROLE_ID).catch(() => null);
    if (role) {
      role.members.forEach(member => {
        member.send({ embeds: [embed] }).catch(() => null);
      });
    }

    await sendLog(message.guild, `📢 تم إرسال خبر بواسطة ${message.author}`);
    return message.reply("تم إرسال الخبر ✅");
  }

  if (message.content.startsWith("!say ")) {
    if (!isReviewer(message.member)) return;

    const args = message.content.split(" ");
    const channelId = args[1];
    const text = args.slice(2).join(" ");

    if (!channelId || !text) {
      return message.reply("الاستخدام: `!say CHANNEL_ID الرسالة`");
    }

    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return message.reply("الاتشانل غير موجود.");

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.MAIN_COLOR)
          .setDescription(text)
          .setImage(CONFIG.APPLY_IMAGE)
          .setFooter({ text: CONFIG.SERVER_NAME })
      ]
    });

    await sendLog(message.guild, `✉️ تم إرسال رسالة في ${channel} بواسطة ${message.author}`);
    return message.reply("تم إرسال الرسالة ✅");
  }
});

client.on("interactionCreate", async interaction => {
  if (interaction.isButton() && interaction.customId === "start_gang_apply") {
    const userId = interaction.user.id;

    if (activeApplications.has(userId)) {
      return interaction.reply({
        content: "عندك تقديم شغال بالفعل. افتح الخاص وكمل أو اكتب `cancel`.",
        ephemeral: true
      });
    }

    if (pendingApplications.has(userId)) {
      return interaction.reply({
        content: "تقديمك موجود عند المراجعة بالفعل.",
        ephemeral: true
      });
    }

    try {
      activeApplications.set(userId, {
        step: 0,
        answers: [],
        guildId: interaction.guild.id
      });

      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG.MAIN_COLOR)
            .setAuthor({ name: CONFIG.SYSTEM_NAME })
            .setTitle("بدأ تقديم العصابة 📩")
            .setDescription(
              [
                line(),
                "",
                "جاوب على الأسئلة واحدة واحدة.",
                "لو عايز تلغي التقديم اكتب:",
                "`cancel`",
                "",
                line()
              ].join("\n")
            )
            .setImage(CONFIG.APPLY_IMAGE)
        ]
      });

      await askQuestion(interaction.user);

      return interaction.reply({
        content: "تم إرسال أسئلة التقديم في الخاص ✅",
        ephemeral: true
      });
    } catch {
      activeApplications.delete(userId);

      return interaction.reply({
        content: "مش قادر أبعتلك خاص. افتح DM من إعدادات السيرفر وجرب تاني.",
        ephemeral: true
      });
    }
  }

  if (interaction.isButton() && interaction.customId === "create_interview") {
    return createInterviewChannel(interaction);
  }

  if (
    interaction.isButton() &&
    (
      interaction.customId.startsWith("accept_") ||
      interaction.customId.startsWith("reject_")
    )
  ) {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية مراجعة التقديمات.",
        ephemeral: true
      });
    }

    const [action, userId] = interaction.customId.split("_");

    if (!pendingApplications.has(userId)) {
      return interaction.reply({
        content: "التقديم ده اتراجع قبل كده أو مش موجود.",
        ephemeral: true
      });
    }

    if (action === "accept") {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (member && CONFIG.ACCEPTED_GANG_ROLE_ID) {
        await member.roles.add(CONFIG.ACCEPTED_GANG_ROLE_ID).catch(() => null);
      }

      const user = await client.users.fetch(userId).catch(() => null);

      if (user) {
        await user.send({
          embeds: [acceptedEmbed()],
          components: [interviewButtonRow()]
        }).catch(() => null);
      }

      pendingApplications.delete(userId);

      await sendLog(interaction.guild, `✅ تم قبول <@${userId}> بواسطة ${interaction.user}`);

      return interaction.update({
        content: `✅ تم قبول <@${userId}> بواسطة ${interaction.user}`,
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(CONFIG.SUCCESS_COLOR)
            .setFooter({ text: "تم القبول" })
        ],
        components: []
      });
    }

    if (action === "reject") {
      const modal = new ModalBuilder()
        .setCustomId(`reject_reason_${userId}`)
        .setTitle("سبب رفض التقديم");

      const reasonInput = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("اكتب سبب الرفض")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(800);

      modal.addComponents(
        new ActionRowBuilder().addComponents(reasonInput)
      );

      return interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("reject_reason_")) {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية مراجعة التقديمات.",
        ephemeral: true
      });
    }

    const userId = interaction.customId.replace("reject_reason_", "");
    const reason = interaction.fields.getTextInputValue("reason");

    if (!pendingApplications.has(userId)) {
      return interaction.reply({
        content: "التقديم ده اتراجع قبل كده أو مش موجود.",
        ephemeral: true
      });
    }

    const user = await client.users.fetch(userId).catch(() => null);

    if (user) {
      await user.send({
        embeds: [rejectedEmbed(reason)]
      }).catch(() => null);
    }

    pendingApplications.delete(userId);

    await sendLog(interaction.guild, `❌ تم رفض <@${userId}> بواسطة ${interaction.user}\nالسبب: ${reason}`);

    return interaction.update({
      content: `❌ تم رفض <@${userId}> بواسطة ${interaction.user}\n**السبب:** ${reason}`,
      embeds: [
        EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(CONFIG.ERROR_COLOR)
          .setFooter({ text: "تم الرفض" })
      ],
      components: []
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
