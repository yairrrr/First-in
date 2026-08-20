# First-In

סביבת פיתוח מבוססת AI שבה המשתמש מתאר אפליקציה או משחק, המערכת בונה אותו,
ולאחר מכן המשתמש לומד בשלבים את הקוד שנוצר עבורו וצובר נקודות עד שהוא מבין
את הפרויקט שיצר.

**עקרון הליבה:** Creation First. Understanding Along the Way.

## סטטוס

Phase 0 ו-Phase 1 הושלמו. Phase 2 החל — סקלטון האפליקציה רץ.

הסקלטון כולל את ארבעת המסכים, את שכבת ה-state ואת ממשק ספק ה-LLM.
הבנייה בפועל, פיצול הקוד ויצירת השאלות עדיין לא מומשו.

## הרצה

```
npm install
npm run dev
npm test
```

Ollama אינו נדרש בשלב הזה.

## תיעוד

- [PRD](docs/PRD.md) — הגדרת המוצר, היקף ה-MVP, מדידה וסיכונים
- [ARCHITECTURE](docs/ARCHITECTURE.md) — מבנה השכבות וזרימת הנתונים
- [DECISIONS](docs/DECISIONS.md) — יומן החלטות ארכיטקטורה ותוצאות spikes

## Stack מתוכנן

React, TypeScript, Vite, React Router, CSS עם Flexbox, Vitest.
מודל שפה מקומי דרך Ollama, ללא עלות וללא שירותי ענן.
