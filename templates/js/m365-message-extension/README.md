# Search based message extension across Microsoft 365

Search-based [message extensions](https://docs.microsoft.com/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions?tabs=nodejs) allow users to search an external system and share results through the compose message area of the Microsoft Teams client. You can now build and run your search-based message extensions in Teams, Outlook for Windows desktop and web experiences.

![Search app demo](https://user-images.githubusercontent.com/11220663/167868361-40ffaaa3-0300-4313-ae22-0f0bab49c329.png)

## Prerequisites

- [Node.js](https://nodejs.org/), supported versions: 16, 18
- An M365 account. If you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/microsoft-365/dev-program)
- [Set up your dev environment for extending Teams apps across Microsoft 365](https://aka.ms/teamsfx-m365-apps-prerequisites)
> Please note that after you enrolled your developer tenant in Office 365 Target Release, it may take couple days for the enrollment to take effect.
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [TeamsFx CLI](https://aka.ms/teamsfx-cli)

## Getting Started

Follow below instructions to get started with this application template for local debugging.

### Test your application with Visual Studio Code

1. Press `F5` or use the `Run and Debug Activity Panel` in Visual Studio Code.
1. Select a target Microsoft application where the message extension runs: `Debug in Teams`, `Debug in Outlook` and click the `Run and Debug` green arrow button.

### Test your application with TeamsFx CLI
1. Install [dev tunnel cli](https://aka.ms/teamsfx-install-dev-tunnel).
1. Login with your M365 Account using the command `devtunnel user login`.
1. Start your local tunnel service by running the command `devtunnel host -p 3978 --protocol http --allow-anonymous`.
1. In the `env/.env.local` file, fill in the values for `BOT_DOMAIN` and `BOT_ENDPOINT` with your dev tunnel URL.
   ```
   BOT_DOMAIN=sample-id-3978.devtunnels.ms
   BOT_ENDPOINT=https://sample-id-3978.devtunnels.ms
   ```
1. Executing the command `teamsfx provision --env local` in your project directory.
1. Executing the command `teamsfx deploy --env local` in your project directory.
1. Executing the command `teamsfx preview --env local --m365-host <m365-host>` in your project directory, where options for `m365-host` are `teams` or `outlook`.

## Use this message extension app

This template provides a simple functionality to search for `npm` packages and render the result in [Adaptive Card](https://docs.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards?tabs=design).

### Use this app in Teams

- `@mention` Your message extension from the `search box area`.

    ![AtBotFromSearch](https://user-images.githubusercontent.com/11220663/167869365-3828ef85-64f7-43bf-9f75-99d882370154.png)

- `@mention` your message extension from the `compose message area`.

    ![AtBotFromMessage](https://user-images.githubusercontent.com/11220663/167869475-528736fa-d0f1-4bf8-9c23-fdffae984802.png)

- Click the `...` under compose message area, find your message extension.

    ![ComposeArea](https://user-images.githubusercontent.com/11220663/167869578-ce33b2ef-f5f2-4be7-a7a0-57e53b6f7c36.png)

### Use this app in Outlook

- Click the "More apps" icon under compose email area, find your message extension.
  
    ![InOutlook](https://user-images.githubusercontent.com/11220663/167869656-20225f14-f982-4e47-8dd0-050285d56853.png)

## References

* [Extend a Teams message extension across Microsoft 365](https://docs.microsoft.com/microsoftteams/platform/m365-apps/extend-m365-teams-message-extension?tabs=manifest-teams-toolkit)
* [Bot Framework Documentation](https://docs.botframework.com/)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)