import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-sigmet-plugin',
    version: '0.1.0',
    icon: '🌩️',
    title: 'SIGMET Plugin',
    description: 'Sigmet plugin to display sigmets and FIR Brazzaville',
    author: 'Manne Micael KITSOUKOU',
    repository: 'https://github.com/windycom/windy-plugin-template',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/my-plugin',
};

export default config;
