import "./Settings.scss";

function SettingsPage({ setPage }) {
    return (
        <div className="page--settings">
            <div class="settings__holder">
                <div className="settings__categories"></div>
                <div className="settings__divider"></div>
                <div className="settings__panel"></div>
            </div>
        </div>
    );
}

export default SettingsPage;
