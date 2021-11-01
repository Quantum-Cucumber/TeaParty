import sanitizeHtml from 'sanitize-html';
import { genThumbnailUrl } from './MessageContent';
import { parseMatrixto } from '../../../../utils/linking';

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
    "a": ["name", "href", "target", "rel", "class"],  // target, rel and class are allowed so they can be transformed. We don't actually pass them directly to the dom
    "img": ["width", "height", "alt", "title", "src"],
    "ol": ["start"],
    "code": ["class"],
};

const allowedClasses = {
    "code": ["languge-*"],
}

const allowedSchemes = ["https", "http", "ftp", "mailto", "magnet"];

const transformTags = {
    "a": (tagName, attribs) => {
        delete attribs.class;  // Only allowed to add mentions class

        attribs.target = "_blank";
        attribs.rel = "noopener noreferrer";

        // Process mentions
        const match = parseMatrixto(attribs.href);
        if (attribs.hasOwnProperty("href") && match.match && match.type !== "event") {
            attribs.class = "mention";
        }

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

    // Only really applies to font and span
    "*": (tagName, attribs) => {
        // Style is only allowed so it can be modified here. Strip any style tags from the parsed html
        delete attribs.style;

        const customColorTags = {
            "data-mx-color": "color",
            "data-mx-bg-color": "background-color",
        }
        
        let style = "";
        // Replace each custom tag with a css style
        for (let customTag in customColorTags) {
            const styleTag = customColorTags[customTag];

            if (attribs.hasOwnProperty(customTag)) {
                const value = attribs[customTag];

                // Ensure the value is a valid hex colour
                if (hexColourRegex.test(value)) {
                    style += `${styleTag}: ${value};`;
                }

                // Delete the custom data-mx property regardless of if the value is valid
                delete attribs[customTag];
            }
        }
        
        attribs.style = style;
        return {tagName, attribs};
    }
}

function parseHtml(html) {
    const cleanHtml = sanitizeHtml(html, {
        allowedTags: allowedTags,
        allowedAttributes: allowedAttributes,
        allowedClasses: allowedClasses,
        allowedSchemes: allowedSchemes,
        allowProtocolRelative: false,
        nestingLimit: 50,  // Inline with element
        transformTags: transformTags,
    });

    return {__html: cleanHtml};
}

export default function HtmlContent({ eventContent }) {
    const sourceHtml = eventContent.formatted_body;
    const parsedHtml = parseHtml(sourceHtml);

    return (
        <span className="message__content--html" dangerouslySetInnerHTML={parsedHtml}></span>
    );
}