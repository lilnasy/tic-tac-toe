import { Agent } from "@newrelic/browser-agent/loaders/agent"
import { Instrument as InstrumentPageViewEvent } from "@newrelic/browser-agent/features/page_view_event"
import { Instrument as InstrumentPageViewTiming } from "@newrelic/browser-agent/features/page_view_timing"
import { Instrument as InstrumentMetrics } from "@newrelic/browser-agent/features/metrics"
import { Instrument as InstrumentErrors } from "@newrelic/browser-agent/features/jserrors"
import { Instrument as InstrumentSoftNav } from "@newrelic/browser-agent/features/soft_navigations"
import { Instrument as InstrumentGenericEvents } from "@newrelic/browser-agent/features/generic_events"
import { Instrument as InstrumentLogs } from "@newrelic/browser-agent/features/logging"
import config from "../new-relic.json"

new Agent({
    ...config,
    features: [
        InstrumentErrors,
        InstrumentGenericEvents,
        InstrumentLogs,
        InstrumentMetrics,
        InstrumentPageViewEvent,
        InstrumentPageViewTiming,
        InstrumentSoftNav,
    ],
    loaderType: 'browser-agent'
})
