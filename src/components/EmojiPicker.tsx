import "./EmojiPicker.scss";
import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { emojiCategories, getEmojiCategories } from "../utils/emojis";
import { classList } from "../utils/utils";

import { FancyText } from "./wrappers";
import { Popup, popupCtx } from "./popups";

import Icon from "@mdi/react";
import { mdiEmoticonHappy, mdiGamepadVariant, mdiHamburger, mdiTree, mdiCarHatchback, mdiCoffee, mdiHeart, mdiFlag } from "@mdi/js";


const tabIcons = {
    [emojiCategories.People]: mdiEmoticonHappy,
    [emojiCategories.Nature]: mdiTree,
    [emojiCategories.Food]: mdiHamburger,
    [emojiCategories.Activities]: mdiGamepadVariant,
    [emojiCategories.Travel]: mdiCarHatchback,
    [emojiCategories.Objects]: mdiCoffee,
    [emojiCategories.Symbols]: mdiHeart,
    [emojiCategories.Flags]: mdiFlag,
}


type EmojiPickerProps = {
    onSelect: (emoji: string) => void,
    setHover?: (hover: boolean) => void,
} & Omit<React.ComponentProps<typeof Popup>, "subClass">;

export default function EmojiPicker({ onSelect, setHover = () => {}, ...popupProps }: EmojiPickerProps) {
    const setPopup = useContext(popupCtx);
    const [selectedGroup, selectGroup] = useState<emojiCategories>(emojiCategories.People);
    const paletteRef = useRef<HTMLDivElement>();

    useEffect(() => {
        setHover(true);
        return () => setHover(false);
    }, [setHover])

    useLayoutEffect(() => {
        paletteRef.current?.scrollTo(0, 0)
    }, [selectedGroup])

    function selectEmoji(mouseEvent: React.MouseEvent, emoji: string) {
        onSelect(emoji);
        if (!mouseEvent.shiftKey) {
            setPopup(null)
        }
    }

    const emojis = getEmojiCategories();

    return (
        <Popup subClass="emoji-picker" {...popupProps}>
            <div className="emoji-picker__categories">
                {
                    Object.keys(tabIcons).map((group) => {
                        const icon = tabIcons[group];

                        return (
                            <div className={classList("emoji-picker__categories__category", {"emoji-picker__categories__category--selected": group === selectedGroup})}
                                key={group} onClick={() => selectGroup(group as emojiCategories)}
                            >
                                <Icon path={icon} size="1.75em" color="var(--text)" />
                            </div>
                        )
                    })
                }
            </div>

            <div className="emoji-picker__palette" ref={paletteRef}>
                <div className="emoji-picker__palette__title">{selectedGroup}</div>
                {
                    emojis[selectedGroup].map((emoji) =>
                        <div className="emoji-picker__emoji" key={emoji.hexcode} onClick={(e) => selectEmoji(e, emoji.emoji)}>
                            <FancyText links={false}>
                                {emoji.emoji}
                            </FancyText>
                        </div>
                    )
                }
            </div>
        </Popup>
    )
}
