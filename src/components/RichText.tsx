/** Renders model text with backtick spans as inline code. */
export function RichText({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code key={index} className="inline-code" dir="ltr">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}
