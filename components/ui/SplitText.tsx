export default function SplitText({ text }: { text: string }) {
    return (
        <span className="split-text">
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">
                {text.split(" ").map((word, index) => (
                    <span key={index}>
                        <span className="split-word" style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}>
                            {word}
                        </span>{" "}
                    </span>
                ))}
            </span>
        </span>
    );
}
