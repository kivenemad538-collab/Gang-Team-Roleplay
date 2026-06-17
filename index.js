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
  AuditLogEvent,
  ChannelType
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require("@discordjs/voice");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;

// ايدي السيرفر
const GUILD_ID = "1465609781837303873";

// اتشانل البانل اللي فيه زرار إرسال المشكلة
const PROBLEM_PANEL_CHANNEL_ID = "1482659774104600587";

// الاتشانل اللي المشاكل تتبعت فيه للإدارة
const PROBLEM_LOG_CHANNEL_ID = "1515680344651730984";

// اتشانل لوق الدعم الفني والمنشن
const SUPPORT_LOG_CHANNEL_ID = "1513995744758071489";

// اتشانل التقييمات
const RATING_LOG_CHANNEL_ID = "1480098551248715896";

// رول الدعم الفني
const SUPPORT_ROLE_ID = "1465764192173686962";

// فويس انتظار الدعم الفني
const WAITING_VOICE_ID = "1467236999151878409";

// 9 فويسات الدعم الفني
const SUPPORT_VOICE_IDS = [
  "1491973206603464798",
  "1491973453694242838",
  "1491973714848251986",
  "1491975360563384450",
  "1491975544328421490",
  "1514274124866781294",
  "1514274166914814003",
  "1514274239862018170",
  "1514274335735418911"
];

// ملف صوت الترحيب، حط ملف اسمه welcome.mp3 جنب index.js
const WELCOME_AUDIO_FILE = "./ScreenRecording_06-17-2026 06-40-39_1.mp4";

// لو true البوت يبعت البانل كل مرة يشتغل، الأفضل تخليها false وتستخدم الأمر !panel
const AUTO_SEND_PANEL = false;

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// userId => { supporterId, supportVoiceId, startedAt }
const activeSupportSessions = new Map();

// userId => { supporterId, ratingSent }
const waitingRatings = new Map();

// ================= READY =================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) return console.log("❌ Guild not found. Check GUILD_ID");

  await joinWaitingVoice(guild);

  if (AUTO_SEND_PANEL) {
    const channel = await guild.channels.fetch(PROBLEM_PANEL_CHANNEL_ID).catch(() => null);
    if (channel) await sendProblemPanel(channel);
  }
});

// ================= PANEL COMMAND =================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content !== "!panel") return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ الأمر ده للإدارة فقط.");
  }

  const channel = await message.guild.channels.fetch(PROBLEM_PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return message.reply("❌ اتشانل البانل مش صح.");

  await sendProblemPanel(channel);
  await message.reply("✅ تم إرسال بانل المشاكل.");
});

// ================= PROBLEM PANEL =================

async function sendProblemPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("🎮 دعم سيرفر FiveM")
    .setDescription(
      "لو عندك أي مشكلة في السيرفر، اضغط على الزر تحت واكتب مشكلتك.\n\n" +
      "الإدارة هتشوف المشكلة وترد عليك في أقرب وقت.\n\n" +
      "لو المشكلة محتاجة مساعدة أكبر، افتح تذكرة دعم فني."
    )
    .setColor(0x2b2d31)
    .setFooter({ text: "Nova Team Support" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("send_problem")
      .setLabel("إرسال المشكلة")
      .setEmoji("📩")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "send_problem") {
        const modal = new ModalBuilder()
          .setCustomId("problem_modal")
          .setTitle("إرسال مشكلة");

        const problemInput = new TextInputBuilder()
          .setCustomId("problem_text")
          .setLabel("اكتب مشكلتك هنا")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(problemInput));
        return interaction.showModal(modal);
      }

      if (interaction.customId.startsWith("rate_")) {
        const rating = interaction.customId.replace("rate_", "");
        const data = waitingRatings.get(interaction.user.id);

        if (!data) {
          return interaction.reply({
            content: "❌ مفيش تقييم مفتوح ليك حالياً.",
            ephemeral: true
          });
        }

        const guild = await client.guilds.fetch(GUILD_ID);
        const ratingChannel = await guild.channels.fetch(RATING_LOG_CHANNEL_ID).catch(() => null);

        const embed = new EmbedBuilder()
          .setTitle("⭐ تقييم دعم فني جديد")
          .setColor(0xf1c40f)
          .addFields(
            { name: "👤 الشخص", value: `<@${interaction.user.id}>`, inline: true },
            { name: "🛠️ الدعم الفني", value: data.supporterId ? `<@${data.supporterId}>` : "غير معروف", inline: true },
            { name: "⭐ التقييم", value: `${rating}/5`, inline: true }
          )
          .setTimestamp();

        if (ratingChannel) await ratingChannel.send({ embeds: [embed] });

        waitingRatings.delete(interaction.user.id);

        return interaction.update({
          content: `✅ شكراً لتقييمك. تقييمك: ${rating}/5`,
          components: []
        });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "problem_modal") {
        const problem = interaction.fields.getTextInputValue("problem_text");

        const guild = await client.guilds.fetch(GUILD_ID);
        const logChannel = await guild.channels.fetch(PROBLEM_LOG_CHANNEL_ID).catch(() => null);

        if (!logChannel) {
          return interaction.reply({
            content: "❌ اتشانل استقبال المشاكل مش متظبط.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("📩 مشكلة جديدة من لاعب")
          .setColor(0xe74c3c)
          .addFields(
            { name: "👤 اللاعب", value: `${interaction.user} \n\`${interaction.user.id}\`` },
            { name: "📝 المشكلة", value: problem }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });

        return interaction.reply({
          content: "✅ تم إرسال مشكلتك للإدارة.",
          ephemeral: true
        });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

// ================= VOICE SUPPORT SYSTEM =================

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const guild = member.guild;

  // لما الشخص يدخل انتظار الدعم
  if (newState.channelId === WAITING_VOICE_ID && oldState.channelId !== WAITING_VOICE_ID) {
    await handleJoinWaiting(member);
  }

  // لما الشخص يتسحب من انتظار الدعم لفويس دعم
  if (
    oldState.channelId === WAITING_VOICE_ID &&
    SUPPORT_VOICE_IDS.includes(newState.channelId)
  ) {
    const supporterId = await getMemberMoveExecutor(guild, member.id);

    activeSupportSessions.set(member.id, {
      supporterId,
      supportVoiceId: newState.channelId,
      startedAt: Date.now()
    });

    const logChannel = await guild.channels.fetch(SUPPORT_LOG_CHANNEL_ID).catch(() => null);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("✅ تم استلام لاعب في الدعم")
        .setColor(0x2ecc71)
        .addFields(
          { name: "👤 اللاعب", value: `<@${member.id}>`, inline: true },
          { name: "🛠️ الدعم الفني", value: supporterId ? `<@${supporterId}>` : "غير معروف", inline: true },
          { name: "🔊 الروم", value: `<#${newState.channelId}>`, inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }

    await safeDM(
      member,
      "✅ تم تحويلك للدعم الفني.\nبعد ما تخلص، هيجيلك تقييم للخدمة."
    );
  }

  // لما الشخص يخرج من فويس الدعم أو يتحرك لفويس عادي
  if (
    SUPPORT_VOICE_IDS.includes(oldState.channelId) &&
    oldState.channelId !== newState.channelId &&
    activeSupportSessions.has(member.id)
  ) {
    const session = activeSupportSessions.get(member.id);
    activeSupportSessions.delete(member.id);

    await sendRatingDM(member, session.supporterId);
  }
});

async function handleJoinWaiting(member) {
  const guild = member.guild;
  const connection = joinVoiceChannel({
    channelId: WAITING_VOICE_ID,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false
});

playWelcomeAudio(connection);

  await joinWaitingVoice(guild);

  const supportOnline = await isSupportAvailable(guild);

  const dmEmbed = new EmbedBuilder()
    .setTitle("🎧 مرحباً بك في الدعم الفني")
    .setColor(0x3498db)
    .setDescription(
      "أنت الآن في انتظار الدعم الفني.\n\n" +
      "لو المشكلة بسيطة، انتظر وسيتم سحبك قريباً.\n" +
      "لو المشكلة تحتاج مساعدة أكبر، يفضل فتح تذكرة دعم فني.\n\n" +
      "شكراً لصبرك ❤️"
    )
    .setFooter({ text: "Nova Team Support" });

  await member.send({ embeds: [dmEmbed] }).catch(() => null);

  const logChannel = await guild.channels.fetch(SUPPORT_LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;

  if (!supportOnline) {
    const embed = new EmbedBuilder()
      .setTitle("⚠️ لاعب ينتظر الدعم")
      .setColor(0xe67e22)
      .setDescription(
        `${member} موجود في انتظار الدعم الفني، لكن مفيش حد من الدعم الفني في الرومات.`
      )
      .setTimestamp();

    await logChannel.send({
      content: `<@&${SUPPORT_ROLE_ID}>`,
      embeds: [embed]
    });
  } else {
    const embed = new EmbedBuilder()
      .setTitle("🎧 لاعب دخل انتظار الدعم")
      .setColor(0x3498db)
      .setDescription(`${member} موجود في انتظار الدعم الفني.`)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  }
}

async function isSupportAvailable(guild) {
  for (const voiceId of SUPPORT_VOICE_IDS) {
    const channel = await guild.channels.fetch(voiceId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) continue;

    const hasSupport = channel.members.some((m) =>
      m.roles.cache.has(SUPPORT_ROLE_ID)
    );

    if (hasSupport) return true;
  }

  return false;
}

async function sendRatingDM(member, supporterId) {
  waitingRatings.set(member.id, {
    supporterId,
    ratingSent: Date.now()
  });

  const embed = new EmbedBuilder()
    .setTitle("⭐ تقييم الدعم الفني")
    .setColor(0xf1c40f)
    .setDescription(
      "شكراً لاستخدامك الدعم الفني.\n\n" +
      "قيّم الشخص اللي ساعدك من 1 إلى 5."
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("rate_1").setLabel("1").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("rate_2").setLabel("2").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("rate_3").setLabel("3").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("rate_4").setLabel("4").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("rate_5").setLabel("5").setStyle(ButtonStyle.Success)
  );

  await member.send({ embeds: [embed], components: [row] }).catch(() => null);
}

async function getMemberMoveExecutor(guild, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberMove,
      limit: 5
    });

    const entry = logs.entries.find((e) => {
      const isRecent = Date.now() - e.createdTimestamp < 8000;
      const targetMatch = e.extra && e.extra.channel;
      return isRecent && targetMatch;
    });

    return entry?.executor?.id || null;
  } catch {
    return null;
  }
}

// ================= BOT JOINS WAITING VOICE =================

async function joinWaitingVoice(guild) {
  const channel = await guild.channels.fetch(WAITING_VOICE_ID).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  try {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    console.log("✅ Bot joined waiting voice");

    return connection;
  } catch (err) {
    console.log("❌ Voice join error:", err);
  }
}

// ================= OPTIONAL PLAY WELCOME AUDIO =================
// ملاحظة: لو عايز البوت يتكلم بصوت، حط ملف welcome.mp3.
// الكود ده جاهز، بس مش مشغل تلقائي عشان ميكررش الصوت كتير.
// لو عايز أشغله عند دخول كل شخص، قولّي أعدلهولك.

function playWelcomeAudio(connection) {
  try {
    const player = createAudioPlayer();
    const resource = createAudioResource(WELCOME_AUDIO_FILE);

    connection.subscribe(player);
    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log("✅ Welcome audio finished");
    });
  } catch (err) {
    console.log("❌ Audio error:", err);
  }
}

// ================= SAFE DM =================

async function safeDM(member, text) {
  try {
    await member.send(text);
  } catch {
    // DM closed
  }
}

// ================= LOGIN =================

client.login(TOKEN);
