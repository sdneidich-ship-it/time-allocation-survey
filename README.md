# Time Allocation Survey

A single-page survey that asks for a typical two weeks in three views (Historical ideal, Current normal, Future ideal) across Travel, Customer meetings, Home base and Other, with live totals against an 80 hour target. Answers are sent to a Google Sheet through a small Google Apps Script. An owner key unlocks a Results view with charts, a table, a CSV download, and the written answers.

## Files

- `index.html`: the survey and the results view (no build step, no dependencies besides Google Fonts).
- `config.js`: holds the address of the backend (one line to edit).
- `apps-script/Code.gs`: the backend that stores answers in a Google Sheet.

## One-time setup

1. Go to script.google.com, choose New project, paste in `apps-script/Code.gs`, and save.
2. Choose `setup` in the function menu and click Run. Approve the permissions. Open the Execution log and copy the **owner key** and the link to the responses sheet.
3. Click Deploy, then New deployment, choose Web app. Set Execute as to **Me** and Who has access to **Anyone**. Deploy and copy the Web app URL (it ends in `/exec`).
4. Paste that URL into `config.js` between the quotes and commit the change.
5. In this repo go to Settings, then Pages, and publish from the `main` branch (root). The survey appears at `https://<user>.github.io/<repo>/`.

## Using it

- Send respondents the Pages link. They can leave their name blank to stay anonymous. On the same browser they can come back and submit again to replace their answers.
- To see results, open the Pages link followed by `#results` (for example `https://<user>.github.io/<repo>/#results`) and enter the owner key.
- The Google Sheet also holds every response (one row each, with the full answer in the `json` column).

## Notes

- Anyone with the Pages link can submit. Only the owner key unlocks results or removing a response. Keep the key private. To change it, edit the `OWNER_KEY` script property in the Apps Script project.
- If you change the activities, edit the data block near the top of the script in `index.html` (between `DATA_START` and `DATA_END`).
- After editing `Code.gs`, redeploy (Deploy, Manage deployments, edit, New version) so the web app picks up the change.
