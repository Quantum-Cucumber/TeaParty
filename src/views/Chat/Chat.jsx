import "./Chat.scss";

function Chat({ room }) {
    return (
        <div className="chat-scroll">
            <div className="chat">
                <Message />
            </div>
        </div>
    );
}

function Message({author, content}) {
    return (
        <div className="message">

        </div>
    );
}

export default Chat;
