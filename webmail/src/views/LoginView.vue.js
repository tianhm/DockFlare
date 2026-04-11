/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import Button from '../components/ui/Button.vue';
const route = useRoute();
const { login } = useAuth();
onMounted(() => {
    const token = route.query.token;
    if (token) {
        login(token);
    }
});
const redirectToMaster = async () => {
    let masterUrl = import.meta.env.VITE_MASTER_URL;
    if (!masterUrl) {
        try {
            const cfg = await fetch('/config.json').then(r => r.json());
            masterUrl = cfg.masterUrl;
        }
        catch { }
    }
    if (!masterUrl)
        masterUrl = window.location.origin.replace('mail.', '');
    window.location.href = `${masterUrl}/email/sso/callback?return_to=${window.location.hostname}`;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex h-screen w-screen items-center justify-center bg-background" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "w-full max-w-sm space-y-6 rounded-lg border p-8 shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col space-y-2 text-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-2xl font-semibold tracking-tight" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-muted-foreground" },
});
/** @type {[typeof Button, typeof Button, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(Button, new Button({
    ...{ 'onClick': {} },
    ...{ class: "w-full" },
}));
const __VLS_1 = __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onClick: (__VLS_ctx.redirectToMaster)
};
__VLS_2.slots.default;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['w-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-background']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['p-8']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-tight']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted-foreground']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            redirectToMaster: redirectToMaster,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=LoginView.vue.js.map