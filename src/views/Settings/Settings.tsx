import "./Settings.scss";
import { useState } from "react";
import { useHistory } from "react-router-dom";

import { Option } from "../../components/elements";
import { Overlay } from "../../components/popups";

import { useOnKeypress } from "../../utils/hooks";

import { Icon } from "@mdi/react";
import { mdiClose } from "@mdi/js";


type SettingsPagesProps = {
    pages: pagesType,
    tabsFooter?: JSX.Element,
    [key: string]: any,
}

export type pagesType = {
    title: string,
    icon?: string,
    divider?: boolean,
    render: renderType,
}[]

type renderType = ({...props}) => JSX.Element;

export default function SettingsPage({ pages, tabsFooter = null, ...props }: SettingsPagesProps) {
    const history = useHistory();

    const [tab, setTab] = useState(pages[0].title);
    const [settingsPage, setSettingsPage] = useState(pages[0].render({...props}));


    function hide() {
        history.goBack();
    }

    function selectOption(k: string, render: renderType) {
        setTab(k);
        setSettingsPage(render({...props}));
    }

    const tabs = [];
    
    pages.forEach(({ icon, title, render, divider = false }) => {
        if (divider) {
            tabs.push(
                <div className="options-divider" key={`${title}-divider`}></div>
            )
        }

        tabs.push(
            <Option key={title} k={title} text={title} select={render ? () => selectOption(title, render) : undefined} selected={tab}>
                {icon && 
                    <Icon path={icon} size="1.4rem" color="var(--text)" />
                }
            </Option>
        );
    });
    
    useOnKeypress("Escape", hide);

    return (
        <Overlay dim={false}>
            <div className="page--settings">
                <div className="page--settings__close" onClick={() => hide()}>
                    <Icon path={mdiClose} size="100%" color="var(--text-greyed)" />
                </div>
                <div className="settings__holder">
                    <div className="settings__categories">
                        {tabs}
                        {tabsFooter}
                    </div>

                    <div className="settings__divider"></div>
                    
                    <div className="settings__panel">
                        {settingsPage}
                    </div>
                </div>
            </div>
        </Overlay>
    );
}
