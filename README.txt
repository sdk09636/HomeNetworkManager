SEE CURRENT NAMESERVER IN /etc/resolv.conf

-> it should contain 'nameserver 127.0.0.1'

TO PREVENT networkmanager FROM MODIFYING THE FILE MAKE IT IMMUTABLE

-> sudo chattr +i /etc/resolv.conf

TO REMOVE THE IMMUTABLE FLAG AND MODIFY IT AGAIN

-> sudo chattr -i /etc/resolv.conf