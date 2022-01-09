import emojidata from "emojibase-data/en/data.json";
import { Emoji } from "emojibase";

const MAX_UNICODE_VERSION = 13;


export const enum emojiCategories {
    People = "People",
    Nature = "Nature",
    Food = "Food",
    Activities = "Activities",
    Travel = "Travel",
    Objects = "Objects",
    Symbols = "Symbols",
    Flags = "Flags",
}


const groupToCategory = {
    0: emojiCategories.People,
    1: emojiCategories.People,
    2: null,
    3: emojiCategories.Nature,
    4: emojiCategories.Food,
    5: emojiCategories.Activities,
    6: emojiCategories.Travel,
    7: emojiCategories.Objects,
    8: emojiCategories.Symbols,
    9: emojiCategories.Flags,
}

const subGroupOverrides = {
    14: emojiCategories.Symbols,
    45: emojiCategories.Nature,
    48: emojiCategories.Objects,
    57: emojiCategories.Objects,
    58: emojiCategories.Objects,
    59: emojiCategories.Nature,
    60: emojiCategories.Objects,
    65: emojiCategories.People,
}

export function getEmojiCategories() {
    const categories: {[group: string]: Emoji[]} = {
        [emojiCategories.People]: [],
        [emojiCategories.Nature]: [],
        [emojiCategories.Food]: [],
        [emojiCategories.Activities]: [],
        [emojiCategories.Travel]: [],
        [emojiCategories.Objects]: [],
        [emojiCategories.Symbols]: [],
        [emojiCategories.Flags]: [],
    };
    
    emojidata
    .filter((emoji) => emoji.version <= MAX_UNICODE_VERSION)
    .forEach((emoji) => {
        if (emoji.subgroup in subGroupOverrides) {
            categories[subGroupOverrides[emoji.subgroup]].push(emoji);
        }
        else {
            categories[groupToCategory[emoji.group]]?.push(emoji);
        }
    })

    return categories;
}
