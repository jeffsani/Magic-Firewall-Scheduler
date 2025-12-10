// src/index.ts

import type { ExecutionContext, Env, Request } from '@cloudflare/workers-types';

interface RuleItem {
    id: string;
    expression: string;
    action: string;
    description: string;
    enabled: boolean;
}

interface WorkerEnv extends Env {
    // Authentication Secrets
    CLOUDFLARE_API_KEY: string;
    CLOUDFLARE_EMAIL: string;

    // Variables from wrangler.toml
    ACCOUNT_ID: string;
    RULESET_ID: string;
    TARGET_RULE_IDS: string;

    // Time settings are now environment variables (numbers)
    ENABLE_HOUR_UTC: number;
    DISABLE_HOUR_UTC: number;
}

// Helper function to create the required Global API Key headers
function getAuthHeaders(env: WorkerEnv): HeadersInit {
    return {
        'X-Auth-Email': env.CLOUDFLARE_EMAIL,
        'X-Auth-Key': env.CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json',
    };
}

export default {
    async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
        return new Response("This worker is dedicated to running scheduled Magic Firewall updates. Status: OK.", {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    },

    async scheduled(
        event: ScheduledEvent,
        env: WorkerEnv,
        ctx: ExecutionContext
    ): Promise<void> {
        const now = new Date();
        const currentHourUtc = now.getUTCHours();

        // --- 1. Determine the Desired State based on UTC time ---
        // Variables are now accessed via env.ENABLE_HOUR_UTC and env.DISABLE_HOUR_UTC
        let desiredState: boolean;
        if (env.ENABLE_HOUR_UTC < env.DISABLE_HOUR_UTC) {
            desiredState = currentHourUtc >= env.ENABLE_HOUR_UTC && currentHourUtc < env.DISABLE_HOUR_UTC;
        } else {
            desiredState = currentHourUtc >= env.ENABLE_HOUR_UTC || currentHourUtc < env.DISABLE_HOUR_UTC;
        }

        const targetRuleIdsArray = env.TARGET_RULE_IDS.split(',').filter(id => id.trim() !== '');

        console.log(`Cron triggered at ${now.toISOString()}. Desired Rule State: ${desiredState ? 'Enabled' : 'Disabled'} for ${targetRuleIdsArray.length} rules.`);

        // --- 2. Validation and API Endpoint Setup ---
        if (!env.CLOUDFLARE_API_KEY || !env.CLOUDFLARE_EMAIL || !env.RULESET_ID || !env.ACCOUNT_ID) {
            console.error("Missing required environment variables.");
            return;
        }

        const API_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/rulesets/${env.RULESET_ID}`;

        try {
            // --- 3. Fetch current ruleset state ---
            const fetchResponse = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: getAuthHeaders(env),
            });

            if (!fetchResponse.ok) {
                throw new Error(`API Fetch Error: ${fetchResponse.status} - ${await fetchResponse.text()}`);
            }

            const ruleset: { result: { rules: RuleItem[] } } = await fetchResponse.json() as any;
            let updateRequired = false;
            const updatedRuleIds: string[] = [];

            // --- 4. Iterate and Update Target Rules ---
            const updatedRules = ruleset.result.rules.map(rule => {
                if (targetRuleIdsArray.includes(rule.id)) {
                    if (rule.enabled !== desiredState) {
                        updateRequired = true;
                        updatedRuleIds.push(rule.id);
                        console.log(`Rule ${rule.id} state change required: ${rule.enabled} -> ${desiredState}.`);
                        return {
                            ...rule,
                            enabled: desiredState,
                        };
                    }
                    return rule;
                }
                return rule;
            });

            // --- 5. Execute Update (Only if state change is required) ---
            if (!updateRequired) {
                console.log("All target rules are already in the desired state. No API update needed.");
                return;
            }

            const updateResponse = await fetch(API_ENDPOINT, {
                method: 'PUT',
                headers: getAuthHeaders(env),
                body: JSON.stringify({
                    rules: updatedRules,
                }),
            });

            if (!updateResponse.ok) {
                throw new Error(`API Update Error: ${updateResponse.status} - ${await updateResponse.text()}`);
            }

            const impactedIdsString = updatedRuleIds.join(', ');
            console.log(`✅ Successfully updated the ruleset. Rules set to: ${desiredState ? 'Enabled' : 'Disabled'}. Impacted Rule IDs: [${impactedIdsString}]`);

        } catch (error) {
            console.error('An unexpected error occurred during API operations:', error);
        }
    },
};