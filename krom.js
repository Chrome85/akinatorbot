const Discord = require("discord.js");
const client = new Discord.Client();
const ayarlar = require("./ayarlar.json");
const chalk = require("chalk");
const fs = require("fs");
const moment = require("moment");
require("moment-duration-format");
const db = require("croxydb");
const ms = require("ms");
client.ayarlar = ayarlar;
require("./Util/eventLoader")(client);

var prefix = ayarlar.token;

const log = message => {
  console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${message}`);
};


client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./komutlar/', (err, files) => {
  if (err) console.error(err);
  log(`${files.length} komut yüklenecek.`);
  files.forEach(f => {
    let props = require(`./komutlar/${f}`);
    log(`Yüklenen komut: ${props.help.name}.`);
    client.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      client.aliases.set(alias, props.help.name);
    });
  });
});

client.reload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

client.load = command => {
  return new Promise((resolve, reject) => {
    try {
      let cmd = require(`./komutlar/${command}`);
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

  client.unload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};







client.elevation = message => {
  if(!message.guild) {
	return; }
  let permlvl = 0;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
  if (message.author.id === ayarlar.sahip) permlvl = 4;
  return permlvl;
};

var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;

client.on('warn', e => {
  console.log(chalk.bgYellow(e.replace(regToken, 'that was redacted')));
});

client.on('error', e => {
  console.log(chalk.bgRed(e.replace(regToken, 'that was redacted')));
});

////-----------------------KOMUTLAR-------------------------------////
const emojis = ["👍", "👎", "❔", "🤔", "🙄", "❌"];
const isPlaying = new Set();
const { Client, MessageEmbed } = require("discord.js");
const { Aki } = require("aki-api");



client.on("message", async message => {
    if (message.author.bot || !message.guild) return;

    if (!message.content.startsWith(".akinatör")) return; //ne yazınca başlasın prfixinizle yazın

    if (isPlaying.has(message.author.id)) {
      return message.channel.send(":x: Oyun zaten başladı.");
    }

    isPlaying.add(message.author.id);

    const aki = new Aki("tr"); // diller: https://github.com/jgoralcz/aki-api

    await aki.start();

    const msg = await message.channel.send(new MessageEmbed()
    .setTitle(`${aki.currentStep + 1} Numaralı Soruyu Soruyorum.`)
      .setColor("BLUE")
      .setFooter("Krom Code <3", client.user.avatarURL())
      .setDescription(`Soru: **${aki.question}**\n${aki.answers.map((an, i) => `${an} | ${emojis[i]}`).join("\n")}`));

    for (const emoji of emojis) await msg.react(emoji);

    const collector = msg.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.name) && user.id == message.author.id, {
      time: 60000 * 6
    });

    collector
      .on("end", () => isPlaying.delete(message.author.id))
      .on("collect", async ({
        emoji,
        users
      }) => {
        users.remove(message.author).catch(() => null);

        if (emoji.name == "❌") return collector.stop();

        await aki.step(emojis.indexOf(emoji.name));

        if (aki.progress >= 70 || aki.currentStep >= 78) {

          await aki.win();

          collector.stop();

          message.channel.send(new MessageEmbed()
            .setTitle(`${message.author.username}, Karakterin bu mu?`)
            .setDescription(`**${aki.answers[0].name}**\n${aki.answers[0].description}\n\nLütfen doğruysa **e** yanlışsa **h** yaz.\n\n**NOT: Eğer içinde E, EVET, H, HAYIR içeren cümleler kurarsan bot otomatik olarak evet/hayır cevabını alır.**`)
            .setImage(aki.answers[0].absolute_picture_path)
            .setColor("BLUE")
            .setFooter("Krom Code <3", client.user.avatarURL()));

          const filter = m => /(evet|hayır|e|h)/i.test(m.content) && m.author.id == message.author.id;

          message.channel.awaitMessages(filter, {
              max: 1,
              time: 30000,
              errors: ["time"]
            })
            .then(collected => {
              const isWinner = /evet|e/i.test(collected.first().content);
              message.channel.send(new MessageEmbed()
                .setTitle(isWinner ? "Harika! Bir kez daha doğru tahmin." : "Oh, sanırsam sen kazandın.")
                .setColor("BLUE")
                .setFooter("Krom Code <3", client.user.avatarURL()));
              }).catch(() => null);
        
        } else {
          msg.edit(new MessageEmbed()
            .setTitle(`${aki.currentStep + 1} Numaralı Soruyu Soruyorum.`)
            .setColor("BLUE")
            .setFooter("Krom Code <3")
            .setDescription(`Soru: **${aki.question}**\n${aki.answers.map((an, i) => `${an} | ${emojis[i]}`).join("\n")}`));
        }
      });
  })


client.login(ayarlar.token);

