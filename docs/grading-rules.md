# Swiss Grading Rules

This document captures the calculation rules implemented in `@notenrechner/shared`.

## Rounding

- Official semester grades round to the nearest 0.5.
- BMS position grades and Fachnoten round to the nearest 0.5.
- EFZ school and UeK module averages round to the nearest 0.5.
- BMS Gesamtnote and EFZ Erfahrungsnote round to one decimal.

Examples:

| Exact value | Rounded to 0.5 |
| ----------- | -------------- |
| 4.24        | 4.0            |
| 4.25        | 4.5            |
| 3.75        | 4.0            |

## Weighted Averages

Grades inside a subject/term use weighted averages:

```txt
sum(grade * weight) / sum(weight)
```

The official semester grade is the weighted average rounded to 0.5.

## Required Grade

For an upcoming grade with known weight:

```txt
required = (targetExactAverage * (currentWeight + upcomingWeight) - currentScore) / upcomingWeight
```

If the target is a rounded semester grade, convert it to its minimum exact threshold first. For example, a rounded 4.5 needs an exact average of 4.25.

## BMS

- Position 2 is the rounded 0.5 average of semester grades.
- Position 1 is either a single exam grade or the rounded 0.5 average of written and oral exams.
- Exam subject Fachnote is the rounded 0.5 average of Position 1 and Position 2.
- Non-exam subject Fachnote is Position 2.
- IDPA/IDAF Fachnote is the rounded 0.5 average of IDPA and IDAF average.
- Gesamtnote is the one-decimal average of all 9 Fachnoten.

Passing requires:

- Gesamtnote at least 4.0
- At most 2 insufficient Fachnoten below 4.0
- Total deviation below 4.0 no more than 2.0

## EFZ

- School module average: average all school module grades, rounded to 0.5.
- UeK module average: average all UeK module grades, rounded to 0.5.
- Erfahrungsnote: `(schoolAverage * 0.8) + (uekAverage * 0.2)`, rounded to one decimal.
- IPA is entered directly.

Passing requires:

- Erfahrungsnote at least 4.0
- IPA at least 4.0
