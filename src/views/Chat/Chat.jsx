import "./Chat.scss";

function Chat({ room }) {
    return (
        <div className="chat">
            <Message />
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
