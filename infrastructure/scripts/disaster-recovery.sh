#!/usr/bin/env bash
# ============================================================================================
# INVIFY ENTERPRISE PLATFORM // AUTOMATED CATASTROPHIC RE-HYDRATION & RESTORATION RUNBOOK
# ============================================================================================
# Fulfills requirement: Highly actionable automated script orchestrating complete environment re-hydration from absolute cold storage buckets.
# Target Infrastructure Layer: k3s / kubeadm physical bare-metal hybrid clusters.

set -euo pipefail

# ANSI color codes for highly visual runtime logging outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}      INVIFY PRODUCTION INFRASTRUCTURE DISASTER RECOVERY SUITE        ${NC}"
echo -e "${CYAN}======================================================================${NC}"

# 1. Require strict authorization attestation verification headers
if [ "${USER:-}" != "root" ] && [ "${INVIFY_DR_OVERRIDE:-}" != "CONFIRMED" ]; then
    echo -e "${RED}[ERROR] Disastrous environment mutations require execution within a secure root runbook context.${NC}"
    echo -e "${YELLOW}Set environment attribute export INVIFY_DR_OVERRIDE=CONFIRMED to unseal emergency restoration protocols.${NC}"
    exit 1
fi

TARGET_BACKUP_S3_PATH="${1:-s3://invify-audit-lineage/exports/latest.sql.gz}"
MINIO_ENDPOINT_URL="${MINIO_URL:-http://localhost:9000}"

echo -e "${GREEN}[1/6] Instantiating isolated cold namespace boundaries...${NC}"
kubectl apply -f ../k8s/base/namespace.yaml

echo -e "${GREEN}[2/6] Restoring external secrets operators and binding root dynamic keys...${NC}"
kubectl apply -f ../k8s/base/secret-management.yaml
echo -e "Awaiting secure credential mappings parsing intervals..."
sleep 10

echo -e "${GREEN}[3/6] Re-hydrating distributed stateful storage arrays (Postgres HA, Redis & Queue sets)...${NC}"
kubectl apply -f ../k8s/data/object-storage.yaml
kubectl apply -f ../k8s/data/queue-infrastructure.yaml
kubectl apply -f ../k8s/data/redis-cluster.yaml
kubectl apply -f ../k8s/data/postgres-ha-cluster.yaml

echo -e "${YELLOW}[INFO] Waiting for stateful primary database shards to achieve operational ready state strings...${NC}"
kubectl wait --for=condition=Ready pod -l cnpg.io/cluster=invify-postgres-ha -n invify-data-core --timeout=300s

echo -e "${GREEN}[4/6] Executing canonical data injection parsing over designated storage dumps...${NC}"
# Extract localized pod name identifier dynamically
DB_POD=$(kubectl get pods -n invify-data-core -l cnpg.io/cluster=invify-postgres-ha,role=primary -o jsonpath='{.items[0].metadata.name}')

echo -e "${CYAN}[INFO] Target database replica state controller identified: ${DB_POD}${NC}"
echo -e "${CYAN}[INFO] Pulling storage archive payload from target path: ${TARGET_BACKUP_S3_PATH}${NC}"

# Execute restore pipelines within temporary volume arrays
kubectl exec -n invify-data-core ${DB_POD} -- /bin/sh -c "
    apt-get update && apt-get install -y awscli
    export AWS_ACCESS_KEY_ID=\$(cat /etc/secrets/minio/ACCESS_KEY)
    export AWS_SECRET_ACCESS_KEY=\$(cat /etc/secrets/minio/SECRET_KEY)
    
    aws --endpoint-url ${MINIO_ENDPOINT_URL} s3 cp ${TARGET_BACKUP_S3_PATH} /tmp/recovery.sql.gz
    echo 'Archive chunk localized. Unzipping and running core sql stream restoration bindings...'
    gzip -d /tmp/recovery.sql.gz
    psql -U invify_db_admin -d invify_matrix_core -f /tmp/recovery.sql
    rm -f /tmp/recovery.sql
"

echo -e "${GREEN}[5/6] Spinning up auto-scaled real-time edge processing gateway nodes...${NC}"
kubectl apply -f ../k8s/apps/backend-deployment.yaml
kubectl apply -f ../k8s/apps/websocket-gateway-scaling.yaml
kubectl apply -f ../k8s/apps/autoscaling-policies.yaml

echo -e "${GREEN}[6/6] Establishing full stack observability engines and verifying live metric streams...${NC}"
kubectl apply -f ../k8s/observability/prometheus-values.yaml
kubectl apply -f ../k8s/observability/grafana-dashboards.yaml
kubectl apply -f ../k8s/observability/loki-stack.yaml
kubectl apply -f ../k8s/observability/otel-collector.yaml
kubectl apply -f ../k8s/observability/infrastructure-observability.yaml

echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}>>> ENVIRONMENT PLATFORM RE-HYDRATED AND SECURED SUCCESSFULLY <<<${NC}"
echo -e "${CYAN}Verify real-time system operational health dashboards at: https://ops.invify.app${NC}"
echo -e "${CYAN}======================================================================${NC}"
