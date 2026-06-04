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
  PermissionsBitField
} = require("discord.js");

const app = express();
app.get("/", (req, res) => res.send("Dark Gang Application Bot Online"));
app.listen(process.env.PORT || 3000);

/* =========================
   عدل كل الأيديهات من هنا
========================= */

const CONFIG = {
  GUILD_ID: "1511828899535781918",

  APPLY_CHANNEL_ID: "1511832476195094599",
  REVIEW_CHANNEL_ID: "1511906559167565924",
  WELCOME_CHANNEL_ID: "1511832465818517714",
  NEWS_CHANNEL_ID: "1511907230944071800",
  LOG_CHANNEL_ID: "1511907497127186482",

  CONTROL_PANEL_CHANNEL_ID: "1511907230944071800",
  INTERVIEW_SCHEDULE_CHANNEL_ID: "1511832476195094599",

  AUTO_ROLE_ID: "1511913983131516938",
  ACCEPTED_GANG_ROLE_ID: "1511914045555343370",

  STAFF_ROLE_IDS: [
    "1511832439985541322",
    "1511832441856200794",
    "1511832439985541322"
  ],

  REVIEWER_ROLE_IDS: [
    "1511832439985541322",
    "1511832441856200794",
    "1511832443399835894"
  ],

  BROADCAST_ROLE_ID: "1511832446474256394",

  SERVER_NAME: "Dark Gang",
  SYSTEM_NAME: "Dark Gang Application System",

  MAIN_COLOR: 0xff0000,
  SUCCESS_COLOR: 0x00ff7f,
  ERROR_COLOR: 0xff0000,

  APPLY_IMAGE: "https://cdn.discordapp.com/attachments/1511907088891248640/1511909759526244492/3ACC9654-C7A5-4890-9B56-71643CD66776.png?ex=6a222b30&is=6a20d9b0&hm=39a8f732141927e14f714570f607b186c8f41eebd54e98e317604b983f546b81&",
  RECEIVED_IMAGE: "https://cdn.discordapp.com/attachments/1511907088891248640/1511909759526244492/3ACC9654-C7A5-4890-9B56-71643CD66776.png?ex=6a222b30&is=6a20d9b0&hm=39a8f732141927e14f714570f607b186c8f41eebd54e98e317604b983f546b81&",
  ACCEPT_IMAGE: "https://cdn.discordapp.com/attachments/1511907088891248640/1511911006626906252/518F623E-374B-4FCE-8AD3-D3C03B658DA0.png?ex=6a222c59&is=6a20dad9&hm=fb4872a5eb9a60e02a3af010c6430f0f273cf378c3b6cf460e1a827fe673774b&",
  REJECTED_IMAGE: "https://cdn.discordapp.com/attachments/1511907088891248640/1511911671105323048/6D903B7F-2DEC-4539-BE57-34053E9E205F.png?ex=6a222cf8&is=6a20db78&hm=2b31f3f466a986ad5a6b6e2b92d774f70459ecb8a6a909c034432003b44681a1&",
  WELCOME_IMAGE: "https://cdn.discordapp.com/attachments/1511907088891248640/1511909759526244492/3ACC9654-C7A5-4890-9B56-71643CD66776.png?ex=6a222b30&is=6a20d9b0&hm=39a8f732141927e14f714570f607b186c8f41eebd54e98e317604b983f546b81&"
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

function line() {
  return "━━━━━━━━━━━━━━━━━━━━";
}

function addImage(embed, url) {
  if (url && url.startsWith("http")) embed.setImage(url);
  return embed;
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
        .setTitle("📌 سجل النظام")
        .setDescription(text)
        .setTimestamp()
    ]
  }).catch(() => null);
}

function applyPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("التقديم على العصابة 📩")
    .setDescription(
      [
        line(),
        "",
        `أهلاً بك في نظام التقديم الرسمي لعصابة **${CONFIG.SERVER_NAME}**`,
        "",
        "سيتم سؤالك عدة أسئلة مهمة.",
        "جاوب بهدوء وبشكل محترم وجدي.",
        "",
        "لو حبيت تلغي التقديم في أي وقت اكتب:",
        "`cancel`",
        "",
        "نتمنى لك التوفيق ❤️",
        "",
        line()
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.SERVER_NAME} • نظام التقديم` });

  return addImage(embed, CONFIG.APPLY_IMAGE);
}

function applyButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_gang_apply")
      .setLabel("تقديم العصابة 📩")
      .setStyle(ButtonStyle.Danger)
  );
}

function controlPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle("لوحة تحكم البوت ⚙️")
    .setDescription(
      [
        line(),
        "",
        "من هنا الإدارة تقدر تستخدم البوت بسهولة.",
        "",
        "📢 إرسال خبر في روم الأخبار",
        "يرسل الخبر للروم المحدد في الكود.",
        "",
        "✉️ إرسال رسالة لروم معين",
        "تكتب أيدي الروم والرسالة والبوت يرسلها.",
        "",
        line()
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.SERVER_NAME} • Control Panel` });
}

function controlButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_news_modal")
      .setLabel("إرسال خبر 📢")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("open_send_modal")
      .setLabel("إرسال رسالة لروم ✉️")
      .setStyle(ButtonStyle.Secondary)
  );
}

function questionEmbed(step) {
  return new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle(`السؤال رقم ${step + 1}`)
    .setDescription(
      [
        QUESTIONS[step],
        "",
        "**اكتب cancel لإلغاء التقديم**"
      ].join("\n")
    );
}

function receivedEmbed() {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.SUCCESS_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("تم استلام طلبك بنجاح ✅")
    .setDescription(
      [
        line(),
        "",
        "تم إرسال تقديمك إلى إدارة العصابة.",
        "طلبك الآن قيد المراجعة.",
        "",
        "يرجى الانتظار وعدم تكرار التقديم.",
        "سيتم إبلاغك بالنتيجة في الخاص.",
        "",
        "نتمنى لك التوفيق والانضمام معنا قريباً ❤️",
        "",
        line()
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.SERVER_NAME} • قيد المراجعة` });

  return addImage(embed, CONFIG.RECEIVED_IMAGE);
}

function reviewEmbed(user, answers) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle("📥 تقديم عصابة جديد")
    .setDescription(
      [
        `👤 **المتقدم:** ${user}`,
        `🆔 **ID:** \`${user.id}\``,
        "",
        `📌 **الحالة:** قيد المراجعة`,
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

function acceptedDmEmbed() {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.SUCCESS_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("تم قبول طلبك مبدئياً 🎉")
    .setDescription(
      [
        line(),
        "",
        "✅ تهانينا!",
        "",
        `تم قبولك مبدئياً في **${CONFIG.SERVER_NAME}**.`,
        "",
        "لكن لسه فاضل آخر مرحلة عشان يكون القبول رسمي.",
        "",
        `ادخل روم مواعيد المقابلة من هنا: <#${CONFIG.INTERVIEW_SCHEDULE_CHANNEL_ID}>`,
        "",
        "شوف ميعاد المقابلة الصوتية وانتظر دورك.",
        "بعد المقابلة، الإدارة هتحدد القبول النهائي.",
        "",
        "نتمنى لك التوفيق ❤️",
        "",
        line()
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.SERVER_NAME} • قبول مبدئي` });

  return addImage(embed, CONFIG.ACCEPT_IMAGE);
}

function rejectedDmEmbed(reason, staffUser) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.ERROR_COLOR)
    .setAuthor({ name: CONFIG.SYSTEM_NAME })
    .setTitle("تم رفض طلبك ❌")
    .setDescription(
      [
        line(),
        "",
        "نعتذر، تم رفض تقديمك في الوقت الحالي.",
        "",
        "**سبب الرفض:**",
        `\`\`\`\n${reason}\n\`\`\``,
        "",
        `تمت المراجعة بواسطة: ${staffUser}`,
        "",
        "يمكنك تحسين إجاباتك ومحاولة التقديم لاحقاً إذا كانت الإدارة تسمح بذلك.",
        "نتمنى لك التوفيق ❤️",
        "",
        line()
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.SERVER_NAME} • نتيجة التقديم` });

  return addImage(embed, CONFIG.REJECTED_IMAGE);
}

function acceptedReviewEmbed(oldEmbed, userId, staffUser) {
  const embed = EmbedBuilder.from(oldEmbed)
    .setColor(CONFIG.SUCCESS_COLOR)
    .setDescription(
      [
        `👤 **المتقدم:** <@${userId}>`,
        `🆔 **ID:** \`${userId}\``,
        "",
        "✅ **الحالة:** تم القبول مبدئياً",
        `👮 **تم القبول بواسطة:** ${staffUser}`,
        "",
        `📌 **المرحلة القادمة:** مراجعة موعد المقابلة في <#${CONFIG.INTERVIEW_SCHEDULE_CHANNEL_ID}>`,
        line()
      ].join("\n")
    )
    .setFooter({ text: "تم القبول مبدئياً" });

  return embed;
}

function rejectedReviewEmbed(oldEmbed, userId, staffUser, reason) {
  const embed = EmbedBuilder.from(oldEmbed)
    .setColor(CONFIG.ERROR_COLOR)
    .setDescription(
      [
        `👤 **المتقدم:** <@${userId}>`,
        `🆔 **ID:** \`${userId}\``,
        "",
        "❌ **الحالة:** تم الرفض",
        `👮 **تم الرفض بواسطة:** ${staffUser}`,
        "",
        "**سبب الرفض:**",
        `\`\`\`\n${reason}\n\`\`\``,
        line()
      ].join("\n")
    )
    .setFooter({ text: "تم الرفض" });

  return embed;
}

function welcomeEmbed(member) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.MAIN_COLOR)
    .setTitle(`مرحباً بك في ${CONFIG.SERVER_NAME}! 🎉`)
    .setDescription(
      [
        `انضم ${member} إلى السيرفر`,
        "",
        `نتمنى لك وقتاً ممتعاً في **${CONFIG.SERVER_NAME}** ✨`,
        "",
        "يرجى قراءة القوانين جيداً قبل البدء 📜",
        "لا تتردد في التواصل مع الإدارة عند الحاجة 💬",
        "",
        `أنت العضو رقم: **#${member.guild.memberCount}**`,
        `عدد الأعضاء: **${member.guild.memberCount} عضو**`,
        "",
        `عمر الحساب: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        `تاريخ الانضمام: <t:${Math.floor(Date.now() / 1000)}:R>`
      ].join("\n")
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${CONFIG.SERVER_NAME} • Member #${member.guild.memberCount}` });

  return addImage(embed, CONFIG.WELCOME_IMAGE);
}

async function sendApplyPanel() {
  const guild = await client.guilds.fetch(CONFIG.GUILD_ID).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(CONFIG.APPLY_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const oldPanel = messages?.find(
    m => m.author.id === client.user.id && m.embeds[0]?.title?.includes("التقديم على العصابة")
  );

  if (oldPanel) return;

  await channel.send({
    embeds: [applyPanelEmbed()],
    components: [applyButtonRow()]
  });
}

async function sendControlPanel() {
  const guild = await client.guilds.fetch(CONFIG.GUILD_ID).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(CONFIG.CONTROL_PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const oldPanel = messages?.find(
    m => m.author.id === client.user.id && m.embeds[0]?.title?.includes("لوحة تحكم البوت")
  );

  if (oldPanel) return;

  await channel.send({
    embeds: [controlPanelEmbed()],
    components: [controlButtons()]
  });
}

async function askQuestion(user) {
  const data = activeApplications.get(user.id);
  if (!data) return;

  await user.send({
    embeds: [questionEmbed(data.step)]
  });
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await sendApplyPanel();
  await sendControlPanel();
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

    await reviewChannel.send({
      content: `${staffMentions()} تقديم جديد من ${message.author}`,
      embeds: [reviewEmbed(message.author, data.answers)],
      components: [reviewButtons(userId)]
    });

    await message.reply({
      embeds: [receivedEmbed()]
    });

    await sendLog(guild, `📨 تم إرسال تقديم جديد من ${message.author}`);
  }

  if (message.guild && message.content.startsWith("!news ")) {
    if (!isReviewer(message.member)) return;

    const text = message.content.replace("!news ", "").trim();
    if (!text) return message.reply("اكتب الخبر بعد الأمر.");

    const newsChannel = await message.guild.channels.fetch(CONFIG.NEWS_CHANNEL_ID).catch(() => null);
    if (!newsChannel) return message.reply("روم الأخبار غير موجود.");

    const embed = new EmbedBuilder()
      .setColor(CONFIG.MAIN_COLOR)
      .setTitle("📢 خبر جديد")
      .setDescription(text)
      .setTimestamp()
      .setFooter({ text: CONFIG.SERVER_NAME });

    addImage(embed, CONFIG.APPLY_IMAGE);

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

  if (message.guild && message.content.startsWith("!say ")) {
    if (!isReviewer(message.member)) return;

    const args = message.content.split(" ");
    const channelId = args[1];
    const text = args.slice(2).join(" ");

    if (!channelId || !text) {
      return message.reply("الاستخدام: `!say CHANNEL_ID الرسالة`");
    }

    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return message.reply("الاتشانل غير موجود.");

    const embed = new EmbedBuilder()
      .setColor(CONFIG.MAIN_COLOR)
      .setDescription(text)
      .setFooter({ text: CONFIG.SERVER_NAME });

    addImage(embed, CONFIG.APPLY_IMAGE);

    await channel.send({ embeds: [embed] });

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

    try {
      activeApplications.set(userId, {
        step: 0,
        answers: [],
        guildId: interaction.guild.id
      });

      const startEmbed = new EmbedBuilder()
        .setColor(CONFIG.MAIN_COLOR)
        .setAuthor({ name: CONFIG.SYSTEM_NAME })
        .setTitle("بدأ تقديم العصابة 📩")
        .setDescription(
          [
            line(),
            "",
            "تم فتح التقديم لك الآن.",
            "جاوب على الأسئلة واحدة واحدة.",
            "",
            "لو عايز تلغي التقديم اكتب:",
            "`cancel`",
            "",
            "بالتوفيق ❤️",
            "",
            line()
          ].join("\n")
        );

      addImage(startEmbed, CONFIG.APPLY_IMAGE);

      await interaction.user.send({ embeds: [startEmbed] });
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

  if (interaction.isButton() && interaction.customId === "open_news_modal") {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية استخدام اللوحة.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("news_modal")
      .setTitle("إرسال خبر");

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("عنوان الخبر")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const textInput = new TextInputBuilder()
      .setCustomId("text")
      .setLabel("محتوى الخبر")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1500);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(textInput)
    );

    return interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId === "open_send_modal") {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية استخدام اللوحة.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("send_message_modal")
      .setTitle("إرسال رسالة لروم معين");

    const channelInput = new TextInputBuilder()
      .setCustomId("channel_id")
      .setLabel("ايدي الروم")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(30);

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("عنوان الرسالة")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100);

    const textInput = new TextInputBuilder()
      .setCustomId("text")
      .setLabel("محتوى الرسالة")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1500);

    modal.addComponents(
      new ActionRowBuilder().addComponents(channelInput),
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(textInput)
    );

    return interaction.showModal(modal);
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

    if (action === "accept") {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);

      if (member && CONFIG.ACCEPTED_GANG_ROLE_ID) {
        await member.roles.add(CONFIG.ACCEPTED_GANG_ROLE_ID).catch(() => null);
      }

      const user = await client.users.fetch(userId).catch(() => null);

      if (user) {
        await user.send({
          embeds: [acceptedDmEmbed()]
        }).catch(() => null);
      }

      await sendLog(interaction.guild, `✅ تم قبول <@${userId}> بواسطة ${interaction.user}`);

      return interaction.update({
        content: `✅ تم قبول <@${userId}> بواسطة ${interaction.user}`,
        embeds: [
          acceptedReviewEmbed(interaction.message.embeds[0], userId, interaction.user)
        ],
        components: []
      });
    }

    if (action === "reject") {
      const modal = new ModalBuilder()
        .setCustomId(`reject_reason_${userId}_${interaction.message.id}`)
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

  if (interaction.isModalSubmit() && interaction.customId === "news_modal") {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية إرسال الأخبار.",
        ephemeral: true
      });
    }

    const title = interaction.fields.getTextInputValue("title");
    const text = interaction.fields.getTextInputValue("text");

    const newsChannel = await interaction.guild.channels.fetch(CONFIG.NEWS_CHANNEL_ID).catch(() => null);
    if (!newsChannel) {
      return interaction.reply({
        content: "روم الأخبار غير موجود.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(CONFIG.MAIN_COLOR)
      .setTitle(`📢 ${title}`)
      .setDescription(
        [
          line(),
          "",
          text,
          "",
          line()
        ].join("\n")
      )
      .setTimestamp()
      .setFooter({ text: `${CONFIG.SERVER_NAME} • News` });

    addImage(embed, CONFIG.APPLY_IMAGE);

    await newsChannel.send({ embeds: [embed] });

    const role = await interaction.guild.roles.fetch(CONFIG.BROADCAST_ROLE_ID).catch(() => null);
    if (role) {
      role.members.forEach(member => {
        member.send({ embeds: [embed] }).catch(() => null);
      });
    }

    await sendLog(interaction.guild, `📢 تم إرسال خبر بواسطة ${interaction.user}`);

    return interaction.reply({
      content: `تم إرسال الخبر في ${newsChannel} ✅`,
      ephemeral: true
    });
  }

  if (interaction.isModalSubmit() && interaction.customId === "send_message_modal") {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية إرسال الرسائل.",
        ephemeral: true
      });
    }

    const channelId = interaction.fields.getTextInputValue("channel_id").trim();
    const title = interaction.fields.getTextInputValue("title") || "رسالة من الإدارة";
    const text = interaction.fields.getTextInputValue("text");

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      return interaction.reply({
        content: "الايدي غلط أو البوت مش شايف الروم.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(CONFIG.MAIN_COLOR)
      .setTitle(title)
      .setDescription(
        [
          line(),
          "",
          text,
          "",
          line()
        ].join("\n")
      )
      .setFooter({ text: `${CONFIG.SERVER_NAME} • الإدارة` });

    addImage(embed, CONFIG.APPLY_IMAGE);

    await channel.send({ embeds: [embed] });

    await sendLog(interaction.guild, `✉️ تم إرسال رسالة في ${channel} بواسطة ${interaction.user}`);

    return interaction.reply({
      content: `تم إرسال الرسالة في ${channel} ✅`,
      ephemeral: true
    });
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("reject_reason_")) {
    if (!isReviewer(interaction.member)) {
      return interaction.reply({
        content: "مش معاك صلاحية مراجعة التقديمات.",
        ephemeral: true
      });
    }

    const parts = interaction.customId.split("_");
    const userId = parts[2];
    const messageId = parts[3];
    const reason = interaction.fields.getTextInputValue("reason");

    const user = await client.users.fetch(userId).catch(() => null);

    if (user) {
      await user.send({
        embeds: [rejectedDmEmbed(reason, interaction.user)]
      }).catch(() => null);
    }

    const reviewChannel = await interaction.guild.channels.fetch(CONFIG.REVIEW_CHANNEL_ID).catch(() => null);
    const reviewMessage = await reviewChannel?.messages.fetch(messageId).catch(() => null);

    if (reviewMessage) {
      await reviewMessage.edit({
        content: `❌ تم رفض <@${userId}> بواسطة ${interaction.user}\n**السبب:** ${reason}`,
        embeds: [
          rejectedReviewEmbed(reviewMessage.embeds[0], userId, interaction.user, reason)
        ],
        components: []
      });
    }

    await sendLog(interaction.guild, `❌ تم رفض <@${userId}> بواسطة ${interaction.user}\nالسبب: ${reason}`);

    return interaction.reply({
      content: "تم رفض التقديم وإرسال السبب للعضو ✅",
      ephemeral: true
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
