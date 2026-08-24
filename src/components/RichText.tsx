/**
 * טקסט מהמודל שמכיל קטעי קוד בגרשיים הפוכים (`כך`).
 * הקטעים מוצגים כקוד מודגש בתוך השורה, ולא כטקסט רגיל.
 */
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
