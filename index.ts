import * as k8s from "@pulumi/kubernetes";

// -----------------------------
// Guestbook Backend Deployment
// -----------------------------
const backendDeployment = new k8s.apps.v1.Deployment("guestbook-backend", {
    metadata: { name: "guestbook-backend" },
    spec: {
        replicas: 1,
        selector: { matchLabels: { app: "guestbook-backend" } },
        template: {
            metadata: { labels: { app: "guestbook-backend" } },
            spec: {
                containers: [
                    {
                        name: "backend",
                        image: "ghcr.io/razacodes/guestbook-backend:latest",
                        ports: [{ containerPort: 8080 }],
                    },
                ],
            },
        },
    },
});

// -----------------------------
// Guestbook Backend Service
// -----------------------------
const backendService = new k8s.core.v1.Service("guestbook-backend-svc", {
    metadata: {
        name: "guestbook-backend",
        labels: { app: "guestbook-backend" },
        annotations: {
            "prometheus.io/scrape": "true",
            "prometheus.io/port": "8080",
            "prometheus.io/path": "/metrics",
        },
    },
    spec: {
        selector: { app: "guestbook-backend" },
        ports: [{ port: 8080, targetPort: 8080 }],
    },
});

// -----------------------------
// Guestbook Frontend Deployment
// -----------------------------
const frontendDeployment = new k8s.apps.v1.Deployment("guestbook-frontend", {
    metadata: { name: "guestbook-frontend" },
    spec: {
        replicas: 1,
        selector: { matchLabels: { app: "guestbook-frontend" } },
        template: {
            metadata: { labels: { app: "guestbook-frontend" } },
            spec: {
                containers: [
                    {
                        name: "frontend",
                        image: "ghcr.io/razacodes/guestbook-frontend:latest",
                        ports: [{ containerPort: 3000 }],
                        env: [
                            {
                                name: "BACKEND_URL",
                                value: "http://guestbook-backend:8080",
                            },
                        ],
                    },
                ],
            },
        },
    },
});

// -----------------------------
// Guestbook Frontend Service
// -----------------------------
const frontendService = new k8s.core.v1.Service("guestbook-frontend-svc", {
    metadata: {
        name: "guestbook-frontend",
        labels: { app: "guestbook-frontend" },
        annotations: {
            "prometheus.io/scrape": "true",
            "prometheus.io/port": "3000",
            "prometheus.io/path": "/metrics",
        },
    },
    spec: {
        type: "NodePort",
        selector: { app: "guestbook-frontend" },
        ports: [{ port: 3000, targetPort: 3000, nodePort: 30081 }],
    },
});

// -----------------------------
// ServiceMonitor for Prometheus
// -----------------------------
const serviceMonitor = new k8s.apiextensions.CustomResource("guestbook-monitor", {
    apiVersion: "monitoring.coreos.com/v1",
    kind: "ServiceMonitor",
    metadata: {
        name: "guestbook-monitor",
        namespace: "default",
    },
    spec: {
        selector: {
            matchExpressions: [
                { key: "app", operator: "In", values: ["guestbook-frontend", "guestbook-backend"] },
            ],
        },
        endpoints: [
            { port: "3000", path: "/metrics", interval: "15s" },
            { port: "8080", path: "/metrics", interval: "15s" },
        ],
    },
});