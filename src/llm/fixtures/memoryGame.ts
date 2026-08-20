/**
 * תשובה שמורה מראש: משחק זיכרון בקובץ HTML יחיד.
 * משמשת לבדיקות אוטומטיות יציבות, ולמי שאין לו Ollama מותקן.
 */
export const memoryGameHtml = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>משחק זיכרון</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; flex-direction: column;
         align-items: center; gap: 16px; padding: 24px; background: #101014; color: #f4f4f5; }
  #board { display: flex; flex-wrap: wrap; gap: 8px; width: 320px; }
  .card { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;
          font-size: 32px; background: #27272a; border-radius: 8px; cursor: pointer; }
  .card.revealed { background: #3f3f46; }
</style>
</head>
<body>
  <h1>משחק זיכרון</h1>
  <p>מהלכים: <span id="moves">0</span></p>
  <div id="board"></div>
  <button id="restart">התחלה מחדש</button>
<script>
  const EMOJI = ['🐙','🦊','🐢','🦉','🐝','🦋','🐳','🦔']
  const board = document.getElementById('board')
  const movesLabel = document.getElementById('moves')
  let first = null, moves = 0, busy = false

  function start() {
    const deck = [...EMOJI, ...EMOJI].sort(() => Math.random() - 0.5)
    board.innerHTML = ''
    first = null; moves = 0; busy = false
    movesLabel.textContent = '0'
    deck.forEach((emoji) => {
      const card = document.createElement('div')
      card.className = 'card'
      card.dataset.emoji = emoji
      card.addEventListener('click', () => reveal(card))
      board.appendChild(card)
    })
  }

  function reveal(card) {
    if (busy || card.classList.contains('revealed')) return
    card.classList.add('revealed')
    card.textContent = card.dataset.emoji
    if (!first) { first = card; return }
    moves += 1
    movesLabel.textContent = String(moves)
    if (first.dataset.emoji === card.dataset.emoji) { first = null; return }
    busy = true
    const previous = first
    first = null
    setTimeout(() => {
      previous.classList.remove('revealed'); previous.textContent = ''
      card.classList.remove('revealed'); card.textContent = ''
      busy = false
    }, 700)
  }

  document.getElementById('restart').addEventListener('click', start)
  start()
</script>
</body>
</html>`
