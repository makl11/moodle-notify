import TelegramBot from "node-telegram-bot-api";
import { promises as fs } from 'fs';
const { writeFile, readFile } = fs;
import { run } from "./index";

const TELEGRAM_TOKEN: string =
	process.env["MOODLE_NOTIFY_TELEGRAM_TOKEN"] ?? "";

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const getAllUsers = async (): Promise<Array<number>> => 
	JSON.parse((await readFile(`./data/users.json`).catch()).toString())

const saveAllUsers = async (users: Array<number>) =>
	await writeFile(`./data/users.json`, JSON.stringify(users));

telegramBot.setMyCommands([
	{
		command: "subscribe",
		description:
			"Join the list of users that get notified about changes in the Moodle courses",
	},
	{
		command: "unsubscribe",
		description:
			"Leave the list of users that get notified about changes in the Moodle courses",
	},
	{
		command: "check",
		description:
			"Check for changes in the Moodle courses",
	},
]);

telegramBot.onText(/\/subscribe/, async (msg) => {
	const chatId = msg.chat.id;
	const allUsers = await getAllUsers();
	if (allUsers.includes(chatId))
		return telegramBot.sendMessage(chatId, "Already subscribed!");
	saveAllUsers([...allUsers, chatId]);
	return telegramBot.sendMessage(chatId, "Subscribed!");
});

telegramBot.onText(/\/unsubscribe/, async (msg) => {
	const chatId = msg.chat.id;
	const allUsers = await getAllUsers();
	await saveAllUsers(allUsers.filter((id) => id !== chatId));
	telegramBot.sendMessage(chatId, "Unsubscribed!");
});

telegramBot.onText(/\/check/, run);
