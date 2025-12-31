import fs from "fs";
import path from "path";
import { Command } from "../types/command.js";
import { Action, Actions } from "../types/action";

export function loadCommands(BASE_DIR: string, FILE_TYPE: string): { [key: string]: Command } {
    console.log("FileType: ", FILE_TYPE);
    console.log("Base Directory: ", BASE_DIR);
    console.log("Fetching command...");

    const commands: { [key: string]: Command } = {};

    const commandFiles = fs
        .readdirSync(path.resolve(BASE_DIR, 'commands'))
        .filter((file) => file.endsWith(FILE_TYPE));

    for (const file of commandFiles) {
        const reqPath = path.resolve(BASE_DIR, 'commands', file);
        const command = require(reqPath).default as Command;
        console.warn(`  Load: ${command.data.name}`);
        commands[command.data.name] = command;
    }

    console.log("End load command");
    console.log("");

    return commands;
}
