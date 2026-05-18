// Minimal allowlist renderer for the live preview: only <b>, <i> and
// <a href="..."> become real nodes; everything else stays literal text.
// Never dangerouslySetInnerHTML raw admin input.

export function PreviewText({ text }: { text: string }) {
    const re = /<b>(.*?)<\/b>|<i>(.*?)<\/i>|<a href="(.*?)">(.*?)<\/a>/gs;
    const nodes: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) nodes.push(text.slice(last, m.index));
        if (m[1] !== undefined) nodes.push(<b key={k++}>{m[1]}</b>);
        else if (m[2] !== undefined) nodes.push(<i key={k++}>{m[2]}</i>);
        else
            nodes.push(
                <a
                    key={k++}
                    href={m[3]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline"
                >
                    {m[4]}
                </a>,
            );
        last = re.lastIndex;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return <div className="whitespace-pre-wrap paragraph-sm">{nodes}</div>;
}
