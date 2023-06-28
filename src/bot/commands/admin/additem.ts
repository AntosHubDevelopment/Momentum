export { }

import { CommandInteraction, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import Asteria from "asteriasdk";

const { SlashCommandBuilder } = require('discord.js');
const Users = require('../../../model/user');
const Profiles = require('../../../model/profiles');

const asteria = new Asteria({
    collectAnonStats: true,
    throwErrors: true,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcosmetic')
        .setDescription('Allows you to give a user any skin, pickaxe, glider, etc.')
        .setDescriptionLocalizations({
            pl: 'Pozwala dać użytkownikowi dowolną skórkę, kilof, lotnię itp.',
            de: 'Ermöglicht es dir, einem Benutzer jeden Skin, Spitzhacke, Gleiter usw. zu geben.',
            fr: 'Vous permet de donner à un utilisateur n\'importe quelle skin, pioche, planeur, etc.',
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to give the cosmetic to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('cosmeticname')
                .setDescription('The name of the cosmetic you want to give')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),


    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const selectedUser = interaction.options.getUser('user');
        const selectedUserId = selectedUser!.id;

        const user = await Users.findOne({ discordId: selectedUserId });
        const profile = await Profiles.findOne({ accountId: user.accountId });
        if (!user) return interaction.editReply({ content: "That user does not own an account", ephemeral: true });
        if (!profile) return interaction.editReply({ content: "That user does not own an account", ephemeral: true });

        const cosmeticname: string = interaction.options.getString('cosmeticname');

        const cosmeticCheck = await asteria.getCosmetic("name", cosmeticname, false);

        const regex = /^(?:[A-Z][a-z]*\b\s*)+$/;

        if (!regex.test(cosmeticname)) return await interaction.editReply({ content: "Please check for correct casing. E.g 'renegade raider' is wrong, but 'Renegade Raider' is correct.", ephemeral: true })

        let cosmetic: any = {};

        try {
            cosmetic = await asteria.getCosmetic("name", cosmeticname, false);
        } catch (err) {
            return await interaction.editReply({ content: "That cosmetic does not exist" });
        } finally {
            try {
                if (profile.profiles.athena.items[`${cosmeticCheck.type.backendValue}:${cosmeticCheck.id}`]) return await interaction.editReply({ content: "That user already has that cosmetic", ephemeral: true });
            } catch (err) {
                await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${cosmeticname}`).then(res => res.json()).then(async json => {
                    const cosmeticFromAPI = json.data;
                    if (profile.profiles.athena.items[`${cosmeticFromAPI.type.backendValue}:${cosmeticFromAPI.id}`]) {
                        await interaction.editReply({ content: "That user already has that cosmetic", ephemeral: true });
                        return;
                    }
                    cosmetic = cosmeticFromAPI;
                })
            }
        }

        await Profiles.findOneAndUpdate(
            { accountId: user.accountId },
            {
                $set: {
                    [`profiles.athena.items.${cosmetic.type.backendValue}:${cosmetic.id}`]: {
                        templateId: `${cosmetic.type.backendValue}:${cosmetic.id}`,
                        attributes: {
                            item_seen: false,
                            variants: [],
                            favorite: false,
                        },
                        "quantity": 1,
                    },
                },
            },
            { new: true },
        )
            .catch((err) => {
            })

        const embed = new EmbedBuilder()
            .setTitle("Cosmetic added")
            .setDescription("Successfully gave the user the cosmetic: " + cosmetic.name)
            .setThumbnail(cosmetic.images.icon)
            .setColor("#2b2d31")
            .setFooter({
                text: "Momentum",
                iconURL: "https://cdn.discordapp.com/app-assets/432980957394370572/1084188429077725287.png",
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    },
};