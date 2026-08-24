/**
 * כל מחרוזת שהמשתמש רואה, בשתי השפות.
 *
 * עברית: לשון פנייה ניטרלית — צורת רבים ("בנו", "בחרו") או שם פועל ("לבנות"),
 * לעולם לא יחיד בזכר או בנקבה. זו הנחיית המוצר.
 */

export type Language = 'he' | 'en'

export const LANGUAGES: readonly Language[] = ['he', 'en']

const he = {
  // כללי
  'app.slogan': 'Build what you want. Learn what you built.',
  'nav.back': 'חזרה לרשימה',
  'nav.backToProject': 'חזרה לפרויקט',
  'nav.map': 'מפת הפרקים',
  'nav.prev': 'הפרק הקודם',
  'nav.next': 'הפרק הבא',
  'settings.language': 'שפה',

  // בית
  'home.title': 'מה בונים היום?',
  'home.placeholder': 'לדוגמה: משחק זיכרון עם 8 זוגות קלפים, מונה מהלכים וכפתור התחלה מחדש',
  'home.build': 'לבנות את זה',
  'home.demo': 'מצב הדגמה, ללא Ollama',
  'home.projects': 'הפרויקטים שלי',
  'home.empty': 'עדיין אין פרויקטים.',
  'home.delete': 'מחיקה',
  'home.deleteConfirm': 'למחוק את הפרויקט הזה? גם ההתקדמות שנצברה תימחק.',
  'status.building': 'בבנייה',
  'status.failed': 'נכשל',
  'status.learned': '{percent}% נלמדו',

  // פרויקט
  'project.notFound': 'הפרויקט לא נמצא',
  'project.building': 'בונים את הפרויקט שלכם.',
  'project.buildingHint': 'המודל רץ מקומית על המחשב. זה לוקח בערך שתי דקות.',
  'project.failed': 'הבנייה נכשלה.',
  'project.rebuild': 'לבנות שוב',
  'project.study': 'ללמוד את הקוד הזה',
  'project.chaptersWaiting': '{count} פרקים ממתינים',
  'project.download': 'הורדה כקובץ HTML',
  'project.fullscreen': 'מסך מלא',

  // מפה
  'study.title': 'מפת הפרויקט',
  'study.nothingYet': 'אין עדיין מה ללמוד',
  'study.nothingHint': 'הפרקים נוצרים אחרי שהפרויקט נבנה.',
  'study.done': '🏆 למדתם את כל הפרויקט שיצרתם.',
  'study.doneStats': '{points} נקודות, {firstTry} מתוך {completed} פרקים נכונים מהניסיון הראשון.',
  'study.progress': '{percent}% נלמדו · {points} נקודות',
  'study.firstTry': ' · {firstTry}/{completed} מהניסיון הראשון',
  'study.completedFirstTry': 'הושלם מהניסיון הראשון',
  'study.completed': 'הושלם',
  'study.next': 'הבא בתור',

  // פרק
  'chapter.notFound': 'הפרק לא נמצא',
  'chapter.heading': 'פרק {n} מתוך {total}',
  'chapter.showCode': 'להציג את הקוד של הפרק',
  'chapter.preparing': 'מכינים את השיעור על הקוד הזה.',
  'chapter.preparingHint': 'בערך רבע דקה.',
  'chapter.lessonFailed': 'יצירת השיעור נכשלה.',
  'chapter.retry': 'לנסות שוב',
  'chapter.concept': 'העיקרון',
  'chapter.toExercise': 'הבנתי, לתרגיל',
  'chapter.tapHint': 'לוחצים על המשבצות לפי הסדר',
  'feedback.alreadyDone': 'הפרק הזה כבר הושלם.',
  'feedback.firstTry': 'נכון. מהניסיון הראשון.',
  'feedback.afterAttempts': 'נכון. אחרי {attempts} ניסיונות.',
  'feedback.wrongChoice': 'לא זה. כדאי לקרוא שוב את הקוד ולנסות שוב.',
  'feedback.wrongOrder': 'כמעט. אפשר לנסות סדר אחר.',

  // דרגה
  'rank.label': 'דרגה {level} · {name}',
  'rank.toNext': '{xp} XP לדרגה {level} · {name}',
  'rank.top': 'הדרגה העליונה',
  'rank.1': 'מתחיל',
  'rank.2': 'לומד',
  'rank.3': 'בונה',
  'rank.4': 'מפתח',
  'rank.5': 'מומחה',

  // כותרות פרקים (מ-codeSplitter)
  'title.markup': 'מבנה העמוד',
  'title.css': 'עיצוב: {selector}',
  'title.cssMore': 'עיצוב: {selector} ועוד {count} כללים',
  'title.function': 'פונקציה: {name}',
  'title.wiring': 'מצב וחיווט',
  'title.wiringN': 'מצב וחיווט {n}',
  'title.extraOne': ' ועוד יחידה אחת',
  'title.extraMany': ' ועוד {count} יחידות',

  // שגיאות
  'error.ollamaUnreachable': 'אין תשובה מ-Ollama. כדאי לוודא שהוא רץ ושהמודל מותקן.',
  'error.ollamaHttp': 'Ollama החזיר שגיאה {status}.',
  'error.ollamaFormat': 'התשובה מ-Ollama אינה בפורמט המצופה.',
  'error.emptyPrompt': 'הפרומפט ריק.',
  'error.notHtml': 'המודל לא החזיר מסמך HTML. כדאי לנסח את הבקשה מחדש.',
  'error.unknown': 'משהו נכשל מסיבה לא ידועה.',
  'error.interrupted': 'הבנייה נקטעה כשהדף נטען מחדש.',
} as const

export type StringKey = keyof typeof he

const en: Record<StringKey, string> = {
  'app.slogan': 'Build what you want. Learn what you built.',
  'nav.back': 'Back to projects',
  'nav.backToProject': 'Back to project',
  'nav.map': 'Chapter map',
  'nav.prev': 'Previous chapter',
  'nav.next': 'Next chapter',
  'settings.language': 'Language',

  'home.title': 'What are we building today?',
  'home.placeholder': 'For example: a memory game with 8 pairs of cards, a move counter and a restart button',
  'home.build': 'Build it',
  'home.demo': 'Demo mode, no Ollama',
  'home.projects': 'My projects',
  'home.empty': 'No projects yet.',
  'home.delete': 'Delete',
  'home.deleteConfirm': 'Delete this project? Your progress in it will be lost too.',
  'status.building': 'Building',
  'status.failed': 'Failed',
  'status.learned': '{percent}% learned',

  'project.notFound': 'Project not found',
  'project.building': 'Building your project.',
  'project.buildingHint': 'The model runs locally on your machine. This takes about two minutes.',
  'project.failed': 'The build failed.',
  'project.rebuild': 'Build again',
  'project.study': 'Learn this code',
  'project.chaptersWaiting': '{count} chapters waiting',
  'project.download': 'Download as HTML',
  'project.fullscreen': 'Fullscreen',

  'study.title': 'Project map',
  'study.nothingYet': 'Nothing to learn yet',
  'study.nothingHint': 'Chapters are created after the project is built.',
  'study.done': '🏆 You learned the whole project you created.',
  'study.doneStats': '{points} points, {firstTry} of {completed} chapters correct on the first try.',
  'study.progress': '{percent}% learned · {points} points',
  'study.firstTry': ' · {firstTry}/{completed} first try',
  'study.completedFirstTry': 'Completed on the first try',
  'study.completed': 'Completed',
  'study.next': 'Up next',

  'chapter.notFound': 'Chapter not found',
  'chapter.heading': 'Chapter {n} of {total}',
  'chapter.showCode': "Show this chapter's code",
  'chapter.preparing': 'Preparing the lesson for this code.',
  'chapter.preparingHint': 'About fifteen seconds.',
  'chapter.lessonFailed': 'Creating the lesson failed.',
  'chapter.retry': 'Try again',
  'chapter.concept': 'The idea',
  'chapter.toExercise': 'Got it, to the exercise',
  'chapter.tapHint': 'Tap the pieces in order',
  'feedback.alreadyDone': 'This chapter is already completed.',
  'feedback.firstTry': 'Correct. On the first try.',
  'feedback.afterAttempts': 'Correct. After {attempts} attempts.',
  'feedback.wrongChoice': 'Not that one. Read the code again and try once more.',
  'feedback.wrongOrder': 'Almost. Try a different order.',

  'rank.label': 'Rank {level} · {name}',
  'rank.toNext': '{xp} XP to rank {level} · {name}',
  'rank.top': 'Top rank',
  'rank.1': 'Beginner',
  'rank.2': 'Learner',
  'rank.3': 'Builder',
  'rank.4': 'Developer',
  'rank.5': 'Expert',

  'title.markup': 'Page structure',
  'title.css': 'Styling: {selector}',
  'title.cssMore': 'Styling: {selector} and {count} more rules',
  'title.function': 'Function: {name}',
  'title.wiring': 'State and wiring',
  'title.wiringN': 'State and wiring {n}',
  'title.extraOne': ' and one more unit',
  'title.extraMany': ' and {count} more units',

  'error.ollamaUnreachable': 'No answer from Ollama. Make sure it is running and the model is installed.',
  'error.ollamaHttp': 'Ollama returned error {status}.',
  'error.ollamaFormat': 'The answer from Ollama is not in the expected format.',
  'error.emptyPrompt': 'The prompt is empty.',
  'error.notHtml': 'The model did not return an HTML document. Try rephrasing the request.',
  'error.unknown': 'Something failed for an unknown reason.',
  'error.interrupted': 'The build was interrupted when the page reloaded.',
}

export const STRINGS: Record<Language, Record<StringKey, string>> = { he, en }

export type Vars = Record<string, string | number>

/** תרגום עם החלפת משתנים: "{n} מתוך {total}". */
export function translate(language: Language, key: StringKey, vars?: Vars): string {
  let text: string = STRINGS[language][key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}
