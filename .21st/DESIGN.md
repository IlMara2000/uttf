# Under The Tower Factory — design direction

Current user-selected direction: street art. Textured walls, pasted posters, rough paint and torn paper supersede the earlier flat street/simple styling.

- Identity: Under The Tower Factory in Rozzano; hip-hop, education, local culture, growth and community.
- Palette: existing orange #FF914D, black and white; neutral grays only.
- Structure: editorial headings, numbered sections and simple dividing rules.
- Current surfaces: painted accents, torn paper and pasted poster framing; original photography carries the identity.
- Preserve original photos, logos, forms and staff functionality.
- Navigation: association, labs, local art, diary, participation; staff access in footer.
- Reuse Next Image, Lucide icons, existing VideoEmbed and ReviewStars; Radix Dialog for accessible modal focus management.
- Responsive layouts, keyboard focus, reduced motion and readable mixed-case body copy.

21st inspiration search attempted; HTTP 401 prevented access. No external component or generated supply was installed.

## Hip-hop refinement — 2026-10-08

- User explicitly requests no emoji or similar decorative symbols. Remove pictographic tile icons and stars; ratings use a numeric scale. Keep only functional arrows, menu and close controls.
- Strong Unbounded poster typography, dark hero, overlapping original photographs, printed labels and flatter surfaces. Retain restrained tactile button depth.
- Numbered editorial activity rows replace the uniform icon-card grid.
- Progressive scroll reveal preserves visible server rendering and keyboard navigation; images react subtly to mouse movement.
- Typographic ticker can be paused, stops offscreen/background and is static for reduced motion.
- Public styling remains separate from staff workflows.

Validation: production build, TypeScript and targeted lint passed. Browser checks confirmed no horizontal overflow at 390px and 320px on home, team, labs, gallery, diary and reviews; ticker pause, reduced motion, scroll reveals and numeric rating selection work. Live Supabase data could not be verified because local environment keys are missing.

## Street / simple revision

- Preserve existing section order, routes, forms and content structure.
- White hero, black navigation, original orange accents. Flat buttons and cards; straight photo framing replaces rotated collage styling.
- Use the existing Space Grotesk for clear, compact headlines; mono labels supply the street editorial rhythm.
- Copy is quietly irreverent: “Non stare al tuo posto”, “Meno prediche. Più pratica.” and “Le etichette, fuori. Le persone, dentro.” Keep the association welcoming, rooted in Rozzano, and focused on art and education.
- Preserve original photos and logos, functional controls, reduced motion and the explicit no-emoji/no-decorative-icon rule.
- 21st search returned HTTP 401; reused existing components without new dependencies.

Street/simple validation: final production build and TypeScript passed; targeted ESLint and git diff --check passed. Home checked at 320, 390, 768 and 1440px; labs, team, gallery, diary and review page checked at mobile width. Original photos load and no horizontal overflow was found. Live Supabase data remains unverified without local environment keys.

## Identity correction — user priority

The user clarified the organization’s legal status. Do not publish a legal classification or acronym on the site. Use “Under The Tower Factory” or the generic “associazione”; preserve the focus on Rozzano, people, art and community. This instruction supersedes all earlier identity assumptions, including historical design decisions. Applies to visible copy, metadata and structured data.

## Street art refinement

- Dark textured hero, orange paint swash behind the final headline, outlined middle line and italic poster lettering.
- Original photographs sit in torn paper frames with subtle pasted tape details; no edited photos, new illustrations, icons or emoji.
- Carry the treatment into section labels, laboratory rows, community photographs, cards and internal page titles. Keep paragraph copy and interactive controls readable and preserve reduced motion.
- Existing structure, destinations, palette and legal-status correction remain unchanged.

Street-art visual validation: home checked at 1440, 768, 390 and 320px with the new stylesheet; labs, team and gallery checked at 390px. No horizontal overflow. Original photographs remain unchanged. 21st review reports informational pre-existing color literals only.

Final verification (2026-10-09): production build completed successfully, including TypeScript and all 25 generated routes. Live backend data is not part of this styling verification.
