// backend/src/federation/RegionalClusterRegistry.js

/**
 * Enterprise Regional Cluster Registry
 * Authoritative source of multi-region operational topologies, managing split-brain degradation rules,
 * leader election consensus algorithms, and cluster capability negotiation boundaries.
 */
class RegionalClusterRegistry {
    constructor() {
        // Topology map indexing globally enrolled regional processing clusters
        this.clusters = new Map();
        
        // Canonical operational states allowed inside the enterprise fleet
        this.allowedStates = new Set([
            'HEALTHY', 'DEGRADED', 'PARTITIONED', 
            'FAILING_OVER', 'RECOVERING', 'READ_ONLY', 'OFFLINE'
        ]);

        // Federation consensus tracking parameters
        this.consensusState = {
            activeLeaderRegion: 'us-east-1',
            currentTerm: 1,
            quorumSatisfied: true,
            lastSplitBrainArbitrationTimestamp: null
        };

        this.registryMetrics = {
            enrolledClustersCount: 0,
            heartbeatsReceived: 0,
            splitBrainDegradationsTriggered: 0,
            leaderElectionsExecuted: 0
        };

        // Initialize core baseline clusters deterministically
        this._enrollInitialClusters();
    }

    /**
     * Pre-populate baseline enterprise hyperscale routing zones
     * @private
     */
    _enrollInitialClusters() {
        this.enrollCluster({
            regionId: 'us-east-1',
            label: 'PRIMARY_SOVEREIGN_ZONE',
            capabilities: ['orchestration', 'telemetry', 'consensus_leader'],
            complianceZones: ['US_COMMERCIAL', 'FEDRAMP_MODERATE']
        });

        this.enrollCluster({
            regionId: 'eu-west-1',
            label: 'SOVEREIGN_EU_ZONE',
            capabilities: ['telemetry', 'local_ledger_only'],
            complianceZones: ['EU_GDPR_STRICT', 'SOVEREIGN_RESIDENCY']
        });

        this.enrollCluster({
            regionId: 'ap-southeast-1',
            label: 'APAC_EDGE_RELAY',
            capabilities: ['telemetry'],
            complianceZones: ['APAC_COMMERCIAL']
        });
    }

    /**
     * Enroll or update regional processing nodes inside the global registry
     * @param {Object} clusterConfig - Topology mapping configuration
     */
    enrollCluster(clusterConfig) {
        if (!clusterConfig || !clusterConfig.regionId) {
            throw new Error('REGISTRATION_FAILED: Mandatory region identification descriptor omitted.');
        }

        const existing = this.clusters.get(clusterConfig.regionId) || {};
        const registeredCluster = {
            ...existing,
            ...clusterConfig,
            state: existing.state || 'HEALTHY',
            replicationLagMs: existing.replicationLagMs || 0,
            lastHeartbeat: Date.now(),
            enrolledAt: existing.enrolledAt || Date.now()
        };

        this.clusters.set(clusterConfig.regionId, registeredCluster);
        this.registryMetrics.enrolledClustersCount = this.clusters.size;
        return registeredCluster;
    }

    /**
     * Process continuous regional cluster heartbeat state matrices
     * @param {string} regionId - Targeted cluster node identifier
     * @param {Object} statusUpdate - Node metrics payload
     */
    recordClusterHeartbeat(regionId, statusUpdate) {
        const cluster = this.clusters.get(regionId);
        if (!cluster) {
            throw new Error(`UNREGISTERED_REGION: Cluster "${regionId}" unlisted inside active cluster map.`);
        }

        this.registryMetrics.heartbeatsReceived++;
        
        let newState = (statusUpdate.state || cluster.state).toUpperCase();
        if (!this.allowedStates.has(newState)) newState = 'DEGRADED';

        // 1. Split-Brain Isolation Handling: 
        // If an independent cluster becomes disconnected from consensus leader quorum, 
        // it must degrade immediately into a restricted READ_ONLY state natively.
        if (newState === 'PARTITIONED') {
            newState = 'READ_ONLY';
            this.registryMetrics.splitBrainDegradationsTriggered++;
            cluster._splitBrainLockActive = true;
            // Disable authoritative orchestration mutations locally to prevent dual-write corruption loops
            cluster.authoritativeWritesEnabled = false;
        } else if (newState === 'HEALTHY' && cluster._splitBrainLockActive) {
            // Post-reconciliation merge completed safely
            cluster._splitBrainLockActive = false;
            cluster.authoritativeWritesEnabled = true;
        }

        cluster.state = newState;
        cluster.replicationLagMs = typeof statusUpdate.replicationLagMs === 'number' ? statusUpdate.replicationLagMs : cluster.replicationLagMs;
        cluster.lastHeartbeat = Date.now();

        this.clusters.set(regionId, cluster);
        return cluster;
    }

    /**
     * Trigger leader election protocol execution when primary sovereign cluster drops offline
     */
    executeConsensusLeaderElection() {
        this.registryMetrics.leaderElectionsExecuted++;
        this.consensusState.currentTerm++;
        
        // Elect available node featuring minimal replication lag vectors
        let candidateRegion = 'us-east-1';
        let minLag = 999999;
        
        this.clusters.forEach((cluster, rId) => {
            if (cluster.state === 'HEALTHY' && cluster.replicationLagMs < minLag) {
                minLag = cluster.replicationLagMs;
                candidateRegion = rId;
            }
        });

        this.consensusState.activeLeaderRegion = candidateRegion;
        this.consensusState.quorumSatisfied = true;
        this.consensusState.lastSplitBrainArbitrationTimestamp = Date.now();
        
        return this.consensusState;
    }

    /**
     * Extract active global multi-cluster enterprise topologies
     */
    getTopologySnapshot() {
        const clusterArray = [];
        this.clusters.forEach(c => clusterArray.push(c));
        return {
            timestamp: Date.now(),
            consensusGovernance: { ...this.consensusState },
            metrics: { ...this.registryMetrics },
            clusters: clusterArray
        };
    }
}

module.exports = new RegionalClusterRegistry();
