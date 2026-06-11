#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /etc/ai-stu-r1
if [ ! -f /etc/ai-stu-r1/student.env ]; then
  sudo cp deploy/systemd/student.env.example /etc/ai-stu-r1/student.env
fi

sudo cp deploy/systemd/ai-stu-r1.service /etc/systemd/system/ai-stu-r1.service
sudo systemctl daemon-reload
sudo systemctl enable --now ai-stu-r1
sudo systemctl status ai-stu-r1 --no-pager
