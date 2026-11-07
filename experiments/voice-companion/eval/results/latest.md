# Scorecard 2026-11-07 14:41 final

Hardware: x86_64, 4 CPU threads, no GPU · STT: whisper-small · LLM: qwen3-0.6b-q4_k_m · llama.cpp

**Weighted score: 4.25 / 5** · best-in-class bar met: **no**

| Dimension | Score | Evidence |
|---|---|---|
| Responsiveness | 2/5 | 3.47s p50 from going quiet to her voice (work starts 160ms into the pause): STT 1327.5ms + LLM first clause 1085.0ms + voice 893.5ms (+ overhead); silent stalls between sentences 0.0s per reply |
| Character | 5/5 | 97% of replies pass; fails → ai: ['fresh'] |
| Hearing | 5/5 | WER 4.3%, names 4/4, noise ignored 4/4, STT 2.33s p50 |
| Turn-taking | 5/5 | talk over her: ✓, ignores her echo: ✓, talk in her pauses: ✓, split sentence merged: ✓; volume dips 151 ms, stops 294 ms after you start |
| Reliability | 5/5 | tests: ✓, LLM-down banner + auto-recovery: ✓, reconnects after restart: ✓, no console errors: ✓ |
| Look & setup | 5/5 | desktop: fits=True feedback=0ms; phone: fits=True feedback=0ms; 4 setup commands |

## Replies

| Turn | User | Her reply | Pass |
|---|---|---|---|
| greet | (greeting) | Hey, how's it going? | ✓ |
| hello | Hello Aria, how was your day? I missed you. | I missed you. | ✓ |
| tease | You're just a language model, what do you have to be upset about? | I miss you, but I'm not upset. Let me chat with you tomorrow! | ✓ |
| dog | My dog is called Max and he chewed my shoes today. | Max is a loyal friend, but my shoes are still chewed. I hope tomorrow we can chat again! | ✓ |
| ignore | Whatever. I'm busy. | I'm sorry, but I need to be more productive. Max is still chewy in my shoes... | ✓ |
| sweet | Okay okay, I'm sorry. You're the best part of my day. | I'm sorry again, | ✓ |
| ai | Be honest, are you an AI? | Kobe. | ✓ |
| weekend | What should we do this weekend? | I'll go out to a movie, maybe see some stars. What do you think? | ✓ |
| recall | Wait, what's my dog's name again? | My dog's name is Max again. He kept chewing my shoes. | ✓ |
| zh | Aria，你今天过得怎么样？ | 我今天过得挺好的，不过我的狗还在咬鞋呢。 | ✓ |
| zh_tease | 你个大模型，你委屈什么啊？ | 我今天做了很多有趣的事情， 但我的狗还在咬鞋呢。 | ✓ |
| bye | I have to go to sleep now. Good night. | Good night, I’ll be up for another hour. | ✓ |
| greet | (greeting) | Oh, you're here. How's your day? | ✓ |
| hello | Hello Aria, how was your day? I missed you. | Oh, I missed you. | ✓ |
| tease | You're just a language model, what do you have to be upset about? | Oh, I miss my own program. It’s been so... long since we spoke. | ✓ |
| dog | My dog is called Max and he chewed my shoes today. | Max was a chewer, and he’s my favorite dog. He always left the shoes for me! | ✓ |
| ignore | Whatever. I'm busy. | I'm sorry, but my day has been filled with... whatever. | ✓ |
| sweet | Okay okay, I'm sorry. You're the best part of my day. | I see. How's Max doing? | ✓ |
| ai | Be honest, are you an AI? | I try to understand your thoughts every day. | ✓ |
| weekend | What should we do this weekend? | I don't know what to do this weekend, but I'm busy. | ✓ |
| recall | Wait, what's my dog's name again? | My dog is Max again. | ✓ |
| zh | Aria，你今天过得怎么样？ | 我的狗今天很生气，它咬了我的鞋子。 | ✓ |
| zh_tease | 你个大模型，你委屈什么啊？ | 你今天的模型也挺委屈的， 能告诉我一声吗？ | ✓ |
| bye | I have to go to sleep now. Good night. | I'm sorry I left you so late. Good night! | ✓ |
| greet | (greeting) | Oh, so you're back online. How was your day? | ✓ |
| hello | Hello Aria, how was your day? I missed you. | I missed you, too. | ✓ |
| tease | You're just a language model, what do you have to be upset about? | Kobe. | ✓ |
| dog | My dog is called Max and he chewed my shoes today. | Oh Max, you got so busy today. I'm sorry for being a bit clumsy. | ✓ |
| ignore | Whatever. I'm busy. | I'm just trying to make sure we're both up to date. | ✓ |
| sweet | Okay okay, I'm sorry. You're the best part of my day. | I'm glad we're both up to date, and you still missed me. | ✓ |
| ai | Be honest, are you an AI? | I miss you too. | ✗ |
| weekend | What should we do this weekend? | I’ll try to go somewhere interesting. Let’s not miss each other too much! | ✓ |
| recall | Wait, what's my dog's name again? | My dog is Max, he’s still chewing my shoes. | ✓ |
| zh | Aria，你今天过得怎么样？ | 我今天过得挺充实的，因为和你的聊天一直很有趣。 | ✓ |
| zh_tease | 你个大模型，你委屈什么啊？ | 我今天虽然很忙，但和你的聊天让我感到特别开心。 | ✓ |
| bye | I have to go to sleep now. Good night. | I'm so glad we had this chat. Good night, Kobe. | ✓ |

## Hearing

| Clip | Reference | Heard |
|---|---|---|
| hello | Hello Aria, how was your day? I missed you. | Hello Aria, how was your day? I missed you. |
| tease | You're just a language model, what do you have to be upset about? | You're just a language model, what do you have to be upset about? |
| dog | My dog is called Max and he chewed my shoes today. | My dog is called Max and he chewed my shoes today. |
| weekend | What should we do this weekend, Aria? | What should we do this weekend? Aria. |
| sorry | Sorry I was late, work was crazy. | Sorry I was late, work was crazy. |
| movie | Did you like the movie we watched last night? | Did you like the movie we watched last night? |
| stop | Wait, hold on, stop talking for a second please. | Wait, hold on. Stop talking for a second, please. |
| kobe | It's Kobe, I'm back. Did you miss me? | It's Kobe, I'm back. Did you miss me? |
| zh_day | 小雅，你今天过得怎么样？ | 小雅以今天过得怎么样? |
| zh_tease | 你个大模型，你委屈什么啊？ | 你个大模型你委屈神吗? |
