# Database Schema Draft

Това е моделът за реална база данни, когато MVP версията се свърже с бекенд.

## Users

- id
- name
- email
- provider
- level
- xp
- streak
- created_at

## Lessons

- id
- title
- level
- theme
- order_index

## Words

- id
- english
- bulgarian
- sentence
- audio_url
- image_url
- lesson_id

## Progress

- id
- user_id
- lesson_id
- score
- completed
- completed_at

## Reviews

- id
- user_id
- word_id
- step
- next_review_at

## ChatMessages

- id
- user_id
- role
- message
- created_at
