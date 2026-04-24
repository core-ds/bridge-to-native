# Сценарии навигации NativeNavigationAndTitleService

Документ описывает, как `NativeNavigationAndTitleService` управляет навигацией внутри WV:
отслеживает стек переходов, синхронизирует кнопку «Назад» и заголовок с NA,
и восстанавливает состояние после hard-навигации.

## Ключевые сущности

| Сущность                       | Где хранится                                                | Описание                                                                                               |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `nativeHistoryStack`           | Память JS + `sessionStorage` (`bridgeToNativeHistoryStack`) | Строковый массив, где индекс = `pageId`, значение = `pageTitle`. Последний элемент — текущая страница. |
| `b2n-pageId`                   | `history.state`                                             | Числовой ключ в `history.state` каждой записи. Равен позиции в стеке (1-based).                        |
| `b2n-next-page-id`             | query-параметр URL                                          | Передаётся при server-side навигации, чтобы следующее WA знало свою позицию в стеке.                   |
| `b2n-title`                    | query-параметр URL                                          | Передаётся при server-side навигации, чтобы следующее WA получило новый заголовок для NA.              |
| `NativeHistoryStackStub` (`0`) | Внутри `nativeHistoryStack`                                 | Заглушка вместо `pageTitle`, когда реальный title неизвестен (cross-origin переход).                   |

## Общая схема работы

```
┌───────────────────────────────────────────────────────────────────┐
│  NativeNavigationAndTitleService                                  │
│                                                                   │
│                                                                   │
│  nativeHistoryStack: ['Title A', 'Title B', 'Title C']            │
│                        ↑ idx 0    ↑ idx 1    ↑ idx 2              │
│                        pageId=1   pageId=2   pageId=3 (current)   │
│                                                                   │
│  На каждое изменение стека:                                       │
│    1. saveNativeHistoryStack() → sessionStorage                   │
│    2. syncHistoryWithNative() → NA (pageId + pageTitle)           │
│                                                                   │
│                                                                   │
│  Android: AndroidBridge.setPageSettings(JSON)                     │
│  iOS:     location.replace('ios:setPageSettings/?pageTitle=…')    │
│                                                                   │
│                                                                   │
│  NA:                                                              │
│    • pageTitle — отображает в нативном заголовке WV               │
│    • pageId>1  — «Назад» работает как `history.back`              │
│    • pageId≤1  — «Назад» закрывает WV                             │
└───────────────────────────────────────────────────────────────────┘
```

## Пример навигации с soft и hard переходами, в т.ч. между origin

Ниже — таблица состояния при последовательности навигаций, включая переходы
между разными origin и возвраты через `goBackAFewSteps` / BBtn / `goBack`.

**Легенда:**

- `0` в стеке — `NativeHistoryStackStub`: заголовок утерян при cross-origin переходе
  (sessionStorage не доступен с другого origin)
- `pageId`: Android всегда получает число; iOS получает `null` при `stack.length ≤ 1`
- «← history.back» — BBtn вызывает `history.back()`
- «закрыть WV» — BBtn закрывает WV

| #   | Действие                                 | nativeHistoryStack                                       | pageId (Android / iOS) | NA: Заголовок | NA: BBtn       |
| --- | ---------------------------------------- | -------------------------------------------------------- | ---------------------- | ------------- | -------------- |
| 0   | Открытие WV, origin1, `«Page1»`          | `['Page1']`                                              | 1 / null               | Page1         | закрыть WV     |
| 1   | `navigateClientSide`, `«Page2»`          | `['Page1', 'Page2']`                                     | 2 / 2                  | Page2         | ← history.back |
| 2   | `navigateServerSide`, origin1, `«Page3»` | `['Page1', 'Page2', 'Page3']`                            | 3 / 3                  | Page3         | ← history.back |
| 3   | `navigateServerSide`, origin2, `«Page4»` | `[0, 0, 0, 'Page4']`                                     | 4 / 4                  | Page4         | ← history.back |
| 4   | `navigateServerSide`, origin2, `«Page5»` | `[0, 0, 0, 'Page4', 'Page5']`                            | 5 / 5                  | Page5         | ← history.back |
| 5   | `navigateServerSide`, origin1, `«Page6»` | `['Page1', 'Page2', 'Page3', 0, 0, 'Page6']`             | 6 / 6                  | Page6         | ← history.back |
| 6   | `navigateServerSide`, origin2, `«Page7»` | `[0, 0, 0, 'Page4', 'Page5', 'Page6', 'Page7']`          | 7 / 7                  | Page7         | ← history.back |
| 7   | `navigateClientSide`, `«Page8»`          | `[0, 0, 0, 'Page4', 'Page5', 'Page6', 'Page7', 'Page8']` | 8 / 8                  | Page8         | ← history.back |
| 8   | `goBackAFewSteps(5)`                     | `['Page1', 'Page2', 'Page3']`                            | 3 / 3                  | Page3         | ← history.back |
| 9   | BBtn                                     | `['Page1', 'Page2']`                                     | 2 / 2                  | Page2         | ← history.back |
| 10  | `goBack()`                               | `['Page1']`                                              | 1 / null               | Page1         | закрыть WV     |
| 11  | BBtn                                     | —                                                        | —                      | —             | WV закрыт      |

### Пояснения к шагам

**Шаги 3, 5, 6 — cross-origin переходы:**

При переходе на другой origin sessionStorage недоступен, поэтому B2N
инициализирует стек через `initializeForNewOrigin` (шаг 3) или
`initializeForForward` (шаги 5, 6), заполняя неизвестные позиции
заглушкой `0`.

**Шаг 5 — возврат на origin1:**

sessionStorage на origin1 сохранил `['Page1', 'Page2', 'Page3']` с шага 2.
`nextPageId=6` (из query), что не совпадает с длиной сохранённого стека (3).
B2N создаёт массив длины 6, копирует известные значения и ставит заглушку
для позиций 4 и 5 (созданных на origin2).

**Шаг 8 — `goBackAFewSteps(5)`:**

Вызывается `history.go(-5)` — cross-origin переход (origin2 → origin1),
происходит полная перезагрузка страницы. B2N реинициализируется:
из `history.state` читается `statePageId=3`, из sessionStorage origin1
восстанавливается стек `['Page1', 'Page2', 'Page3']` (метод
`initializeForBackward`).

**Шаг 10 — `goBack()`:**

`goBack()` вызывает `goBackAFewSteps(-1, true)`. При `stack.length=2`
имеется одна запись для возврата, поэтому `autoCloseWebview` не срабатывает.
Переход к `pageId=1`, BBtn снова закрывает WV.

**Шаг 11 — BBtn при `pageId ≤ 1`:**

NA закрывает WV.
