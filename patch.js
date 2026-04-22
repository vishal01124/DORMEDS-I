const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Add Distributor Settings card in rProfile (admin section, before sessions card)
// Insert after the closing of the pgrid div (line 881: `    </div>`)
// and before the sessions card

const oldSessionsCard = "    <div class=\"card\" style=\"margin-top:14px\"><div class=\"ch\"><h3><span class=\"material-icons-round\" style=\"vertical-align:middle;margin-right:6px;font-size:18px\">devices</span>Active Sessions</h3>";
const newDistCard = "    " + "${isAdmin?`<div class=\"card\" style=\"margin-top:14px\"><div class=\"ch\"><h3><span class=\"material-icons-round\" style=\"vertical-align:middle;margin-right:6px;font-size:18px\">storefront</span>Distributor Settings</h3><span class=\"badge b-ok\">Admin Only</span></div><div class=\"cb\"><div class=\"fr\"><div class=\"fg\"><label>Company Name</label><input id=\"ds-name\" value=\"${this.data.dist.name||''}\"></div><div class=\"fg\"><label>Phone / Support</label><input id=\"ds-phone\" value=\"${this.data.dist.phone||''}\"></div></div><div class=\"fr\"><div class=\"fg\"><label>Email</label><input id=\"ds-email\" value=\"${this.data.dist.email||''}\"></div><div class=\"fg\"><label>UPI ID <span style='color:var(--acc);font-size:.75rem'>★ For QR payments</span></label><input id=\"ds-upi\" placeholder=\"e.g. yourname@okicici\" value=\"${this.data.dist.upi||''}\"></div></div><div class=\"fr\"><div class=\"fg\"><label>GST Number</label><input id=\"ds-gst\" value=\"${this.data.dist.gst||''}\"></div><div class=\"fg\"><label>License No.</label><input id=\"ds-lic\" value=\"${this.data.dist.license||''}\"></div></div><div class=\"fg\"><label>Address</label><textarea id=\"ds-addr\" style=\"min-height:60px\">${this.data.dist.address||''}</textarea></div><button class=\"btn btn-p\" onclick=\"A.saveDistSettings()\"><span class=\"material-icons-round\">save</span>Save Settings</button></div></div>`:''}";
const newSessionsCard = newDistCard + "\n    <div class=\"card\" style=\"margin-top:14px\"><div class=\"ch\"><h3><span class=\"material-icons-round\" style=\"vertical-align:middle;margin-right:6px;font-size:18px\">devices</span>Active Sessions</h3>";

code = code.replace(oldSessionsCard, newSessionsCard);
console.log('Distributor settings card added:', code.includes('ds-upi') ? 'OK' : 'FAIL');

// Add saveDistSettings() function after logoutAll
const insertAfterLogoutAll = `

  async saveDistSettings(){
    const d={
      name:Q('#ds-name')?.value.trim()||this.data.dist.name,
      phone:Q('#ds-phone')?.value.trim()||this.data.dist.phone,
      email:Q('#ds-email')?.value.trim()||this.data.dist.email,
      upi:Q('#ds-upi')?.value.trim()||this.data.dist.upi,
      gst:Q('#ds-gst')?.value.trim()||this.data.dist.gst,
      license:Q('#ds-lic')?.value.trim()||this.data.dist.license,
      address:Q('#ds-addr')?.value.trim()||this.data.dist.address,
    };
    const res=await apiPost('/dist-settings',d);
    if(res?.ok){
      Object.assign(this.data.dist,d);
      this.toast('Distributor settings saved!','ok','UPI: '+d.upi);
    } else {
      this.toast('Save failed','err');
    }
  },`;

// Insert after logoutAll function closing
const logoutAllEnd = `  async logoutAll(){\n    if(!confirm('Sign out from ALL devices including this one?'))return;\n    await apiPost('/logout-all',{});\n    this.toast('Signed out from all devices','ok');\n    setTimeout(()=>{\n      localStorage.removeItem('pd_token');localStorage.removeItem('pd_user');this._token=null;\n      this.st.user=null;this.st.role=null;this.st.page='login';\n      this.data={pharmacies:[],drugs:[],orders:[],bills:[],returns:[],tickets:[],notifs:[],chats:[],dist:this.data.dist};\n      this.render();\n    },1500);\n  },`;

const logoutAllWithNew = logoutAllEnd + insertAfterLogoutAll;
code = code.replace(logoutAllEnd, logoutAllWithNew);
console.log('saveDistSettings added:', code.includes('saveDistSettings') ? 'OK' : 'FAIL');

fs.writeFileSync('app.js', code, 'utf8');
console.log('Done!');
