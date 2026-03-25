#!/usr/bin/env bash
# check-cluster-env.sh — Assess HPC cluster capabilities for running a
# lightweight monitoring agent. Run on each cluster's login node.
# Produces a plain-text report to stdout.

set -uo pipefail

REPORT=""
section() { REPORT+=$'\n'"===== $1 ======"$'\n'; }
item()    { REPORT+="  $1: $2"$'\n'; }
note()    { REPORT+="  ⮑  $1"$'\n'; }
notes_from_cmd() {
    # Read command output into REPORT without a subshell
    while IFS= read -r line; do
        note "$line"
    done < <("$@" 2>/dev/null || true)
}

section "GENERAL"
item "Hostname" "$(hostname -f 2>/dev/null || hostname)"
item "Date" "$(date -u '+%Y-%m-%d %H:%M UTC')"
item "OS" "$(uname -srm)"
item "User" "$(whoami)"

# --- Scheduler -----------------------------------------------------------
section "SCHEDULER"
if command -v sinfo &>/dev/null; then
    item "Type" "Slurm"
    item "Version" "$(sinfo --version 2>/dev/null || echo 'unknown')"

    # List partitions with time limits
    item "Partitions" ""
    notes_from_cmd sinfo -o "%P %l %a %D"

    # Check for debug/interactive/service partitions
    debug_parts=$(sinfo -o "%P" -h 2>/dev/null | grep -iE 'debug|interactive|service|monitor' || true)
    if [[ -n "$debug_parts" ]]; then
        item "Candidate low-latency partitions" "$debug_parts"
    else
        item "Candidate low-latency partitions" "none found"
    fi

    # QOS
    if sacctmgr -n list qos format=name%-30 2>/dev/null | head -20 | grep -q .; then
        item "QOS policies" ""
        notes_from_cmd sacctmgr -n list qos format=name%-30,priority,maxwall
    fi

elif command -v qstat &>/dev/null; then
    item "Type" "PBS/Torque"
    item "Version" "$(pbsnodes --version 2>/dev/null || qstat --version 2>/dev/null || echo 'unknown')"

    # List queues
    item "Queues" ""
    notes_from_cmd qstat -Q

    debug_queues=$(qstat -Q -f 2>/dev/null | grep -i "Queue:" | grep -iE 'debug|interactive|service|monitor' || true)
    if [[ -n "$debug_queues" ]]; then
        item "Candidate low-latency queues" "$debug_queues"
    fi
else
    item "Type" "none detected (no sinfo or qstat)"
fi

# --- Login node resource limits -------------------------------------------
section "LOGIN NODE LIMITS"
item "ulimit -t (CPU seconds)" "$(ulimit -t 2>/dev/null || echo 'N/A')"
item "ulimit -v (virtual mem KB)" "$(ulimit -v 2>/dev/null || echo 'N/A')"
item "ulimit -u (max procs)" "$(ulimit -u 2>/dev/null || echo 'N/A')"
item "ulimit -n (open files)" "$(ulimit -n 2>/dev/null || echo 'N/A')"

# Check cgroup limits
if [[ -f /proc/self/cgroup ]]; then
    cg_path=$(sed -n 's/^.*:://p' /proc/self/cgroup 2>/dev/null | head -1)
    if [[ -n "$cg_path" ]]; then
        for f in /sys/fs/cgroup"${cg_path}"/memory.max /sys/fs/cgroup"${cg_path}"/cpu.max; do
            if [[ -f "$f" ]]; then
                item "cgroup $(basename "$f")" "$(cat "$f" 2>/dev/null)"
            fi
        done
    fi
fi

# --- Persistence mechanisms -----------------------------------------------
section "PERSISTENCE (login node)"
if systemctl --user status &>/dev/null 2>&1; then
    item "systemd --user" "available"
else
    item "systemd --user" "not available"
fi

if crontab -l &>/dev/null 2>&1 || [[ $? -eq 1 ]]; then
    # exit 1 from crontab -l means "no crontab" which still means cron works
    item "user crontab" "available"
else
    item "user crontab" "not available or blocked"
fi

for tool in tmux screen nohup; do
    if command -v "$tool" &>/dev/null; then
        item "$tool" "available"
    else
        item "$tool" "not found"
    fi
done

# --- Networking from login node -------------------------------------------
section "NETWORKING (login node)"
item "http_proxy" "${http_proxy:-not set}"
item "https_proxy" "${https_proxy:-not set}"
item "no_proxy" "${no_proxy:-not set}"

# Test outbound HTTPS — use --head and accept any HTTP response (even 4xx)
# as proof of connectivity. A bare GET to api.anthropic.com returns 4xx
# without auth, so -sf would false-negative.
if curl --head --max-time 5 -o /dev/null -w '' https://api.anthropic.com 2>/dev/null; then
    item "Outbound HTTPS (api.anthropic.com)" "reachable"
elif curl --head --max-time 5 -o /dev/null -w '' https://httpbin.org/get 2>/dev/null; then
    item "Outbound HTTPS (httpbin.org)" "reachable (anthropic unreachable)"
else
    item "Outbound HTTPS" "BLOCKED or no curl"
fi

if curl -sf --max-time 5 -o /dev/null https://slack.com 2>/dev/null; then
    item "Outbound HTTPS (slack.com)" "reachable"
else
    item "Outbound HTTPS (slack.com)" "blocked or unreachable"
fi

# DNS check
if nslookup api.anthropic.com &>/dev/null 2>&1 || host api.anthropic.com &>/dev/null 2>&1; then
    item "DNS resolution" "working"
else
    item "DNS resolution" "may be restricted"
fi

# --- Networking from compute node (submit a probe job) --------------------
section "NETWORKING (compute node — async)"

probe_script=$(mktemp /tmp/cron-bot-net-probe.XXXXXX.sh)
probe_out="/tmp/cron-bot-net-probe-$(date +%s).out"

cat > "$probe_script" <<'PROBE'
#!/usr/bin/env bash
echo "=== Compute node network probe ==="
echo "Hostname: $(hostname)"
echo "http_proxy: ${http_proxy:-not set}"
echo "https_proxy: ${https_proxy:-not set}"
for url in https://api.anthropic.com https://slack.com https://httpbin.org/get; do
    if curl --head --max-time 10 -o /dev/null -w '' "$url" 2>/dev/null; then
        echo "$url: REACHABLE"
    else
        echo "$url: BLOCKED"
    fi
done
if nslookup api.anthropic.com &>/dev/null 2>&1 || host api.anthropic.com &>/dev/null 2>&1; then
    echo "DNS: working"
else
    echo "DNS: restricted"
fi
PROBE
chmod +x "$probe_script"

if command -v sbatch &>/dev/null; then
    job_id=$(sbatch --job-name=cron-bot-probe --time=00:05:00 --ntasks=1 --mem=256M \
        --output="$probe_out" --error="$probe_out" "$probe_script" 2>/dev/null | sed 's/[^0-9]//g' || true)
    if [[ -n "$job_id" ]]; then
        item "Slurm probe job" "submitted (job $job_id)"
        note "Output will be at: $probe_out"
        note "Check with: cat $probe_out  (after job completes)"
    else
        item "Slurm probe job" "submission failed"
    fi
elif command -v qsub &>/dev/null; then
    job_id=$(qsub -N cron-bot-probe -l walltime=00:05:00 -l mem=256mb \
        -o "$probe_out" -e "$probe_out" "$probe_script" 2>/dev/null || true)
    if [[ -n "$job_id" ]]; then
        item "PBS probe job" "submitted ($job_id)"
        note "Output will be at: $probe_out"
        note "Check with: cat $probe_out  (after job completes)"
    else
        item "PBS probe job" "submission failed"
    fi
else
    item "Compute probe" "skipped (no scheduler)"
fi

# --- Software / runtime ---------------------------------------------------
section "SOFTWARE"
for cmd in node python3 python pip pip3 npm npx; do
    if command -v "$cmd" &>/dev/null; then
        ver=$("$cmd" --version 2>/dev/null | head -1)
        item "$cmd" "$ver"
    fi
done

# Check if node is available via module
if command -v module &>/dev/null; then
    node_modules=$(module avail node 2>&1 | grep -iE 'node|nodejs' || true)
    if [[ -n "$node_modules" ]]; then
        item "Node via modules" "$node_modules"
    fi
fi

# --- Shared filesystem -----------------------------------------------------
section "FILESYSTEM"
for dir in "$HOME" /scratch /tmp /work; do
    if [[ -d "$dir" ]]; then
        avail=$(df -h "$dir" 2>/dev/null | tail -1 | awk '{print $4}')
        fs=$(df -T "$dir" 2>/dev/null | tail -1 | awk '{print $2}' || true)
        item "$dir" "exists, ${avail:-?} free, type=${fs:-?}"
    fi
done

# --- Print report ----------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           cron-bot cluster environment report               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "$REPORT"
echo ""
echo "NOTE: The compute node network probe runs asynchronously."
echo "Check its output file after the job completes."
