import { useState, useEffect, useReducer, useContext, createContext } from 'react';
import { render } from 'react-dom';
import sanitizeHtml from 'sanitize-html';

import { genThumbnailUrl } from './MessageContent';
import { Tooltip } from '../../../../components/popups';
import { userPopupCtx } from '../../../../components/user';

import { classList } from '../../../../utils/utils';
import { parseMatrixto } from '../../../../utils/linking';
import { tryGetUser } from '../../../../utils/matrix-client';

const hexColourRegex = /^#[0-9a-f]{6}$/i;

// Taken directly from matrix spec
const allowedTags = [
    "font", "del", "h1", "h2", "h3",
    "h4", "h5", "h6", "blockquote", "p",
    "a", "ul", "ol", "sup", "sub",
    "li", "b", "i", "u", "strong",
    "em", "strike", "code", "hr", "br",
    "div", "table", "thead", "tbody", "tr",
    "th", "td", "caption", "pre", "span",
    "img", "details", "summary"
];

const allowedAttributes = {
    "font": ["data-mx-bg-color", "data-mx-color", "color", "style"],  // Style is allowed but overridden to convert data-mx-*
    "span": ["data-mx-bg-color", "data-mx-color", "data-mx-spoiler", "style"],  // Style is allowed but overridden to convert data-mx-*
    "a": ["name", "href", "target", "rel"],  // target, rel are allowed so they can be transformed. We don't actually pass them directly to the dom
    "img": ["width", "height", "alt", "title", "src"],
    "ol": ["start"],
    "code": ["class"],
};

const allowedClasses = {
    "code": ["languge-*"],
}

const allowedSchemes = ["https", "http", "ftp", "mailto", "magnet"];

function customTagToStyle(attribs, customTag, style, validation = ()=>{return true}) {
    let output = "";

    if (attribs.hasOwnProperty(customTag)) {
        if (validation(attribs[customTag])) {
            output = `${style}:${attribs[customTag]};`
        }

        delete attribs[customTag]
    }

    return output;
}

const transformTags = {
    "a": (tagName, attribs) => {
        attribs.target = "_blank";
        attribs.rel = "noopener noreferrer";

        return {tagName, attribs};
    },
    "img": (tagName, attribs) => {
        // Only allow mxc urls
        if (attribs.src?.startsWith("mxc:")) {
            attribs.src = genThumbnailUrl(attribs.src, attribs.width, attribs.height);
        }
        else {
            return {tagName, attribs: {}};  // Return with no src etc.
        }

        return {tagName, attribs};
    },


    "span": (tagName, attribs) => {
        let style = "";
        style += customTagToStyle(attribs, "data-mx-color", "color", (value) => hexColourRegex.test);
        style += customTagToStyle(attribs, "data-mx-bg-color", "background-color", (value) => hexColourRegex.test);
        
        attribs.style = style;
        return {tagName, attribs};
    },

    "font": (tagName, attribs) => {
        let style = "";
        style += customTagToStyle(attribs, "data-mx-color", "color", (value) => hexColourRegex.test);
        style += customTagToStyle(attribs, "data-mx-bg-color", "background-color", (value) => hexColourRegex.test);

        // Check that color property is valid
        if (attribs.hasOwnProperty("color")) {
            if (!hexColourRegex.test(attribs.color)) {
                delete attribs.color;
            }
        }
        
        attribs.style = style;
        return {tagName, attribs};
    },
}

function cleanHtml(html) {
    const cleanedHtml = sanitizeHtml(html, {
        allowedTags: allowedTags,
        allowedAttributes: allowedAttributes,
        allowedClasses: allowedClasses,
        allowedSchemes: allowedSchemes,
        allowProtocolRelative: false,
        nestingLimit: 50,  // Inline with element
        transformTags: transformTags,
    });

    return cleanedHtml;
}

function CleanedHtml({ eventContent, spanRef }) {
    const body = eventContent.formatted_body;
    const content = cleanHtml(body);

    return (
        <span ref={spanRef} className="message__content--html" dangerouslySetInnerHTML={{__html: content}}></span>
    );
}

export default function HtmlContent({ eventContent }) {
    const [domTree, domTreeRef] = useState();

    useEffect(() => {
        if (!domTree) {return}

        applySpoilers(domTree.childNodes);
        formatUserMentions(domTree.childNodes);

    }, [domTree])

    return (
        <CleanedHtml eventContent={eventContent} spanRef={domTreeRef} />
    );
}


function applySpoilers(nodeList) {
    let node = nodeList[0];

    while (node) {
        if (node.tagName === "SPAN" && node.hasAttribute("data-mx-spoiler")) {
            const reason = node.getAttribute("data-mx-spoiler");
            node.removeAttribute("data-mx-spoiler");

            const container = document.createElement("span");
            const component = (
                <Spoiler reason={reason} content={node.outerHTML} />
            );
            // Turn into dom
            render(component, container);
            // Transform node
            node.parentNode.replaceChild(container, node);
            node = container;
        }

        // If node has children, run function over those too
        if (node.childNodes?.length) {
            applySpoilers(node.childNodes);
        }

        node = node.nextElementSibling;
    }
}
function Spoiler({reason, content}) {
    // Content should be a sanitised dom tree
    const [visible, toggleVisible] = useReducer(current => !current, false);

    return reason ?
        (
            <Tooltip text={reason} dir="top" x="mouse">
                <span className={classList("spoiler", {"spoiler--visible": visible})} onClick={toggleVisible} dangerouslySetInnerHTML={{__html: content}}></span>
            </Tooltip>
        )
        :
        (
            <span className={classList("spoiler", {"spoiler--visible": visible})} onClick={toggleVisible} dangerouslySetInnerHTML={{__html: content}}></span>
        )
}

function formatUserMentions(nodeList) {
    let node = nodeList[0];

    while (node) {
        if (node.tagName === "A" && node.hasAttribute("href")) {
            const match = parseMatrixto(node.href);

            if (match.match && match.type === "user") {
                const container = document.createElement("span");
                const component = (
                    <UserMention userId={match.identifier} />
                );
                // Turn into dom
                render(component, container);
                // Transform node
                node.parentNode.replaceChild(container, node);
                node = container;
            }
        }

        // If node has children, run function over those too
        if (node.childNodes?.length) {
            formatUserMentions(node.childNodes);
        }

        node = node.nextElementSibling;
    }
}

function UserMention({ userId }) {
    const setUserPopup = useContext(userPopupCtx);

    const user = tryGetUser(userId);
    function userPopup(e) {
        setUserPopup({parent: e.target.closest(".mention"), user: user})
        console.log("clicked")
    }

    return (
        <span className="mention data__user-popup" onClick={userPopup}>@{user.displayName}</span>
    )
}

