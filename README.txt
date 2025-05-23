1. SEE CURRENT NAMESERVER IN /etc/resolv.conf

	-> it should contain 'nameserver 127.0.0.1'

2. TO PREVENT networkmanager FROM MODIFYING THE FILE MAKE IT IMMUTABLE

	-> sudo chattr +i /etc/resolv.conf

   TO REMOVE THE IMMUTABLE FLAG AND MODIFY IT AGAIN

	-> sudo chattr -i /etc/resolv.conf

3. TO ALLOW DNS REQUESTS FROM EXTERNAL HOSTS, ALLOW TCP AND UDP REQUESTS IN FIREWALL

   FOR FIREWALLD
	-> sudo firewall-cmd --add-service=dns --permanent
	-> sudo firewall-cmd --reload
   TO CHECK
	-> sudo firewall-cmd --list-all

   FOR UFW
	-> sudo ufw allow 53
   TO CHECK
	-> sudo ufw status verbose

4. MODIFY /etc/dnsmasq.conf TO MAKE THE DNS SERVER TO LISTEN TO EXTERNAL REQUESTS

	-> Comment "interface=lo"
	-> Uncomment "listen-address=" and assign "listen-address=0.0.0.0"

5. TO ENBALE LOGGING OF DNS QUERIES
   
   ADD THESE TWO LINES
	-> log-queries
	-> log-facility=<PATH WHERE TO SAVE LOGS>



