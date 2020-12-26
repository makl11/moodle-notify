import TelegramBot from "node-telegram-bot-api";
import { readFileSync, writeFileSync } from "fs";
import { run } from "./index";

const TELEGRAM_TOKEN: string =
	process.env["MOODLE_NOTIFY_TELEGRAM_TOKEN"] ?? "";

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const getAllUsers = (): Array<number> =>
	JSON.parse(readFileSync(`./data/users.json`).toString());
const saveAllUsers = (users: Array<number>) =>
	writeFileSync(`./data/users.json`, JSON.stringify(users));

telegramBot.setMyCommands([
	{
		command: "subscribe",
		description:
			"Join the list of users that get notified about changes in their Moodle courses",
	},
	{
		command: "unsubscribe",
		description:
			"Leave the list of users that get notified about changes in their Moodle courses",
	},
]);

telegramBot.onText(/\/subscribe/, (msg) => {
	const chatId = msg.chat.id;
	const allUsers = getAllUsers();
	if (allUsers.includes(chatId))
		return telegramBot.sendMessage(chatId, "Already subscribed!");
	saveAllUsers([...allUsers, chatId]);
	return telegramBot.sendMessage(chatId, "Subscribed!");
});

telegramBot.onText(/\/unsubscribe/, (msg) => {
	const chatId = msg.chat.id;
	const allUsers = getAllUsers();
	saveAllUsers(allUsers.filter((id) => id !== chatId));
	telegramBot.sendMessage(chatId, "Unsubscribed!");
});

telegramBot.onText(/\/check/, run);
