## 2026-06-21T00:46:54Z
You are tasked with implementing Milestone 1 of Category 7 ("UI/UX Designer") in the portfolio project.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please perform the following steps:

1. Edit index.html (services section, lines 163-300):
Add transitions and scaling/rotation hover classes to the <i> elements of all 9 service cards so that the icons animate smoothly on card hover.
Classes to add: `transition-transform duration-300 ease-out-expo group-hover:scale-110 group-hover:rotate-6`
For example, for the first service card icon:
`<i data-lucide="code" class="w-6 h-6 transition-transform duration-300 ease-out-expo group-hover:scale-110 group-hover:rotate-6"></i>`

2. Edit components/header.html:
Add subtle scaling tactile feedback to both desktop (line 15) and mobile (line 33) theme toggle buttons by adding `hover:scale-110 active:scale-95` to the buttons' classes.

3. Edit style.css (theme toggle tactile feedback):
Append the following CSS to style.css to implement the keyframe-based ripple feedback animation on click for the theme toggle button:
```css
@keyframes ripple {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.4;
    }
    100% {
        transform: translate(-50%, -50%) scale(2.5);
        opacity: 0;
    }
}

.theme-toggle-btn {
    position: relative;
    overflow: hidden;
}

.theme-toggle-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: var(--accent);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    pointer-events: none;
}

.theme-toggle-btn:active::after {
    animation: ripple 0.4s ease-out;
}
```

4. Edit index.html (contact form inputs focus visible rings, lines 882-905):
Update classes for input fields `contact-name` and `contact-email`, and textarea `contact-project`.
- Replace the broken `border-b border-background/20` and `placeholder:text-background/20` which fail to parse opacity.
- Replace with: `border-white/20 dark:border-black/20 placeholder:text-white/30 dark:placeholder:text-black/30`
- Enhance focus-visible styles by adding `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground` to inputs.
Full replacement class lists should be:
- Name input: `w-full bg-transparent border-b border-white/20 dark:border-black/20 py-4 text-xl focus:outline-none focus:border-accent transition-all duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground placeholder:text-white/30 dark:placeholder:text-black/30`
- Email input: `w-full bg-transparent border-b border-white/20 dark:border-black/20 py-4 text-xl focus:outline-none focus:border-accent transition-all duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground placeholder:text-white/30 dark:placeholder:text-black/30`
- Project textarea: `w-full bg-transparent border-b border-white/20 dark:border-black/20 py-4 text-xl focus:outline-none focus:border-accent transition-all duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground placeholder:text-white/30 dark:placeholder:text-black/30 resize-none`

5. Verify:
- Compile styles using `npm run build:css`.
- Run `node verify-changes.js` to ensure the project continues to compile and run with no syntax or namespace errors.
- Document all run outputs and verification logs in your handoff report at: `c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_worker_m1\handoff.md`
