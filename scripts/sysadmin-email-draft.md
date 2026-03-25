Subject: Advice on running a lightweight job-monitoring daemon

Hi [cluster support team],

I'm working on a tool that monitors my batch jobs — it checks job
status, reads log files on the shared filesystem, and sends
notifications via HTTPS (Slack). It's very lightweight: ~50 MB RAM,
negligible CPU, but it needs to be long-running and have outbound HTTPS
access.

A few questions:

1. **Login node daemons** — Is it acceptable to run a small background
   process on a login node (e.g., via tmux, user systemd, or cron)?
   If not, is there a recommended alternative?

2. **Compute node networking** — Do compute nodes have outbound HTTPS
   access, or is there a proxy I should use?

3. **Service/workflow nodes** — Does the cluster have any nodes
   designated for orchestration or long-running lightweight services
   (similar to how Airflow or Prefect might be deployed)?

4. **Preferred approach** — Given the above use case, what deployment
   method would you recommend for this environment?

Happy to provide more details. Thanks for your help!

Best,
[your name]
