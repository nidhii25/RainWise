# Step 0 - Confirm product and engineering decisions

**Status:** Complete — decisions recorded; full CPWD/CGWB transcription remains partial

## Work completed

- Decided RainWise is a general web application that any company may use; deployment is not limited to one named company.
- Decided login is for retaining each user account's property/assessment history. An account sees its own records; records are private across accounts.
- Decided the initial release does not need company administration, reviewer roles, or team sharing.
- Created `docs/DECISIONS.md` to keep settled choices and open questions together.

## Why

The user described the product as an on-site assessment tool available to any company, with login used to keep track of assessed places. A simple account-owned record model supports that without introducing company-management workflows.

## Decisions and limitations

- Multi-user shared workspaces are out of initial scope unless later requirements show that multiple staff need a shared property register.
- The backend must still enforce account-level record authorization; an open signup does not make saved assessments public.
- Signup method, required survey fields, assessment types, engineering methods, data sources, storage, report requirements, and deployment remain open.

## Verification

Recorded in the implementation plan and decision register. No code or access-control policy has been implemented yet.

## Decision update - assessment scope

- Agreed that MVP covers rooftop rainwater harvesting plus preliminary artificial recharge assessment.
- The user does not have recharge criteria to provide during planning; researching and validating authoritative methods is a later planning/engineering task.
- Until a method is selected and validated, RainWise must not invent suitability thresholds or show definitive recharge recommendations. It should preserve relevant site inputs and report methodology pending/insufficient data.
- Added `docs/PRODUCT_SCOPE.md` and updated `docs/DECISIONS.md` and the Step 0 checklist.

## Decision update - account registration

- Agreed that anyone can create a RainWise account with an email address; company invitation or approval is not required.
- The identity provider and exact sign-in, email verification, and account recovery method remain open.
- Updated the plan, product scope, and decision register.

## Decision update - survey coverage

- Chose the full survey in `RainWise_Project_Plan_and_Developer_Handoff.md`, Sections A-J, as the MVP field-schema baseline.
- Adapt organization/employee attribution to the signed-in user account; do not require a company tenant. Collect owner contacts only if there is a privacy justification.
- Keep the full section coverage, but leave field requiredness, units, validation, and calculation-specific minimum inputs to a later decision. Unknown values remain explicit and cannot be treated as safe.
- Added the section-by-section baseline to `docs/PRODUCT_SCOPE.md` and updated the checklist/register.

## Final scope decisions (2026-10-27)

- **Individual accounts only.** No companies, organizations, roles, sharing, reviewer queues, or admin console. Each account sees only its own properties and assessments.
- **One user, many places.** A user can register unlimited properties and run multiple assessments per property over time; history is append-only.
- **Output.** The assessment answers litres, feasibility, structure type, exact sizes, piping, quantities, an underground recharge structure, and a 3D view.
- **Visuals.** The 3D model is deterministic and built from stored dimensions. The Gemini image is labelled "illustrative, not to scale" and never supplies a dimension.
- **Engineering stance.** No engineering advisor is available. Every result is preliminary and based on transcribed published guidance plus labelled project assumptions. Synthetic data is used only as a test fixture and is labelled as such.
- **Five recharge states.** `ELIGIBLE`, `CONDITIONALLY_ELIGIBLE`, `NOT_ELIGIBLE`, `INSUFFICIENT_DATA`, `REVIEW_REQUIRED`. Missing values never become zero, a default, or a pass.
- **Data sources.** NASA POWER monthly rainfall (`PRECTOTCORR`), SoilGrids 2.0 texture, CPWD Table 2 and IS 15797 runoff coefficients, and CGWB 2007 Table 5.3 / §6.2.3.3 recharge criteria. See `docs/DATA_SOURCES.md`.
- **Documents.** `docs/DECISIONS.md`, `docs/DATA_SOURCES.md`, `docs/DESIGN_RULES.md`, `docs/USER_FLOW.md`, and the active `docs/IMPLEMENTATION_PLAN.md`. The old organization/reviewer plan is superseded.

The user's closing scope statement was: "That is all we are going to give. That's all I want." The implementation treats the list above as binding and records anything beyond it as deferred.
