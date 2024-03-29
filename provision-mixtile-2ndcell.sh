sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get update
# Stop and disable the system's default DHCP and DNS services

sudo apt-get install ca-certificates curl gnupg lsb-release hostapd nano dnsmasq ca-certificates curl gnupg -y

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli docker-compose containerd.io docker-buildx-plugin docker-compose-plugin -y

#Install portainer management portal
sudo docker volume create portainer_data
sudo docker run -d -p 8000:8000 -p 9443:9443 --name portainer \
    --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    cr.portainer.io/portainer/portainer-ce:latest

sudo timedatectl set-timezone Africa/Johannesburg
cd /usr/local/bin
sudo ./module_select.sh

sudo parted -s nvme0n1 mklabel gpt
sudo parted -s nvme0n1 mkpart primary "ext4" 0% "235GiB"
sudo mkfs.ext4 nvme0n1p1
sudo mkdir -p /media/nvme
sudo mount /dev/nvme0n1p1 /media/nvme
/dev/nvme0n1p1 /media/nvme ext4 defaults 0 0

sudo umount /oem
sudo umount /userdata
sudo parted /dev/mmcblk0 rm 8
sudo parted /dev/mmcblk0 rm 7
sudo parted /dev/mmcblk0 resizepart 6 100%
sudo resize2fs /dev/mmcblk0p6

#Prep docker folders 
sudo mkdir /media/nvme/docker
sudo chmod 0777 /media/nvme/docker

sudo ip link set wlan0 down
sudo ip addr flush dev wlan0
sudo ip addr add 192.168.8.98/24 dev wlan0
sudo ip link set wlan0 up

config_to_add="
auto wlan0
iface wlan0 inet static
    address 192.168.8.98
    netmask 255.255.255.0
    gateway 192.168.8.98
"

# Append the configuration to the interfaces file
echo "$config_to_add" | sudo tee -a /etc/network/interfaces > /dev/null

# Start DHCP and DNS with dnsmasq
sudo chmod 0777 /etc/dnsmasq.conf
sudo cat << EOF > /etc/dnsmasq.conf
interface=wlan0
dhcp-range=192.168.8.10,192.168.8.60,12h
address=/#/192.168.8.98
EOF

# Configure hostapd for the access point
sudo touch /etc/hostapd/hostapd.conf
sudo chmod 0777 /etc/hostapd/hostapd.conf
sudo cat << EOF > /etc/hostapd/hostapd.conf
interface=wlan0
ssid=R5 VIDEOS - DATA FREE
hw_mode=g
channel=6
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
EOF

# Start hostapd and dnsmasq
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd
sudo systemctl enable dnsmasq
sudo systemctl start dnsmasq

#set nameserver for dnsmarq so that queries can work
sudo rm /etc/resolv.conf
sudo touch /etc/resolv.conf
sudo chmod 0777 /etc/resolv.conf
sudo echo "nameserver 1.1.1.1" > /etc/resolv.conf

# Enable IP forwarding to provide internet access
sudo sysctl net.ipv4.ip_forward=1
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j DNAT --to-destination 192.168.8.98
sudo iptables -t nat -A POSTROUTING -j MASQUERADE

# Save the IP forwarding configuration
sudo sh -c "echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf"


cat <<EOF > docker-compose.yml
version: '3.3'

services:
  view4all:
    image: registry.peachss.co.za/view4all_client-server:arm
    container_name: view4all_container
    restart: unless-stopped
    environment:
      - DeviceID=2ndcell-mixtile-004
      - ParentServer=https://2ndcell.vqa.view4all.tv/
    volumes:
      - /media/nvme/docker/v4-server:/app/wwwroot/content
  nginx:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - /media/nvme/docker/nginx/data:/data
      - /media/nvme/docker/nginx/letsencrypt:/etc/letsencrypt
EOF
sudo docker-compose up -d

#Enable 4G
sudo touch /lib/systemd/system/4G.service
sudo chmod 0777 /lib/systemd/system/4G.service
sudo cat << EOF > /lib/systemd/system/4G.service
[Unit]
Description=4G Service
After=network.target

[Service]
ExecStart=/etc/init.d/quectel-CM -s flickswitch
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable 4G
sudo systemctl start 4G

# Update SSH configuration
mkdir ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCLnNDE1DDgt2QZPSdo+eRhSEts8umPjwdO3K8JsXWd3lgkGXO/X8IfiZrZCclC8LRTb7O7lAUfvtWAq8BEjrDTUV05eegyiK6MYXdxl5Nhp5MHWsgtaLkQGIzNpNBDGtuFg07kLEwunKLct87soVeiOJHx6ULxEW5p7pT9ErSHkXE/1BW9ZRjZuxeIckOF2rmcHAWGKcs3V7xbuZYAgwgWNqBMmjA3bbwpqXR33WOgvXuCeT18r4BvISZYVMfuUiGDRDxgaCbOgYQM+PM/ulCGlbPUFb7kJ97vplWvEhjwpRHruf7xr4JHdEaltzQ1BWxH8ombAqCHRm7UIxXKepY3 Wilco" >> ~/.ssh/authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQEA5m/JxKerXL/oOAisXVnuFELDaoMXCkG7AfXmsTTrv0sBcO7yrY6tgZEY/b6BrJ9/aLko6pq1IKp52271QK9f2TzRPpQyeei60/5xjSFJRGbQK9FTmlH82HyztoruiXYgeU22bAv6sLzO0Y0/peO72iGvo7p/I83rdF7XSvsY1scfimW+sF/KfQm1Hq5Bo9wrPij//yRt5PRG2kPTjMErv6LC3cdwaeyjqQDOhx7eJlolYKS/xWgRREKd2np3mhaJ/zFAMh01TE2/WLc0YD2bpHQuqM/YXgAndE0Vzhdo8PxsRPDklXzvs+vmCLTWcZteVC/gFqw7Jw1HGQHGxg4qqQ== rsa-key-20210324-view4all" >> ~/.ssh/authorized_keys


sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^ChallengeResponseAuthentication yes/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#ChallengeResponseAuthentication no/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config


sudo systemctl restart ssh
