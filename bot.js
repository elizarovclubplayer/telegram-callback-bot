require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const bot = new Telegraf(process.env.BOT_TOKEN);
const userStates = {};

bot.start((ctx) => { // Обработчик /start
    ctx.reply(
        `👋 Привет, ${ctx.from.first_name}!\n\n` +
        `Я бот, который поможет быстро оставить заявку на обратный звонок.\n` +
        `Просто нажми кнопку ниже и ответь на 3 коротких вопроса — и мы с тобой свяжемся в удобное время! ☎️`,
        Markup.keyboard([
            ["☎ Оставить заявку"]
        ]).resize()
    );
});

bot.hears("☎ Оставить заявку", (ctx) => {
    const chatId = ctx.chat.id;
    userStates[chatId] = {step: "name"};
    ctx.reply("Укажите Ваше имя");
});

bot.on("text", (ctx, next) => {
    const chatId = ctx.chat.id;
    const state = userStates[chatId];
    if (!state) return next();

    const text = ctx.message.text;

    if (state.step === "name") {
        state.name = text;
        state.step = "phone";
        ctx.reply("Введите ваш номер телефона");
    } else if (state.step === "phone") {
        const phone = text.trim();

        // Валидация
        const cleaned = phone.replace(/[^+\d]/g, ""); // Удаляем всё кроме цифр и "+"
        if (cleaned.length < 10 || !/^\+?\d{10,15}$/.test(cleaned)) {
            return ctx.reply("❗ Пожалуйста, введите корректный номер телефона (например: +7 900 123 45 67)");
        }

        state.phone = phone;
        state.step = "time";
        ctx.reply("Укажите удобное время для звонка");
    } else if (state.step === "time") {
        state.time = text;

        const call = {
            name: state.name,
            phone: state.phone,
            time: state.time,
            date: new Date().toLocaleString("ru-RU")
        };

        let calls = [];

        try {
            const data = fs.readFileSync("calls.json", "utf8");
            calls = data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Ошибка чтения calls.json:", e.message);
            calls = []; // если ошибка — начинаем с пустого массива
        }
        calls.push(call);
        fs.writeFileSync("calls.json", JSON.stringify(calls, null, 2));

        ctx.reply(
            `✅ Спасибо, ${state.name}!\n` +
            `Мы перезвоним вам в **${state.time}**.\n\n` +
            `Если вы указали неверное время — просто нажмите кнопку "Оставить заявку" и введите данные заново.`
        );
        delete userStates[chatId];
    }
});

bot.launch();