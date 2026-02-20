
import React, { useState, useRef } from 'react';
import { User, Sector } from '../types';
import { backend } from '../services/supabaseBackend';
import { UserCog, Save, Loader2, KeyRound, ShieldCheck, Mail, Camera, Lock, Palette, Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  currentUser: User;
  sectors: Sector[];
}

export const ProfileView: React.FC<Props> = ({ currentUser, sectors }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'customization'>('info');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    avatar: currentUser.avatar,
    sector: currentUser.sector
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Customization Form State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Create local preview
      setProfileForm({ ...profileForm, avatar: URL.createObjectURL(file) });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      let avatarUrl = profileForm.avatar;

      // 1. If file selected, upload it first
      if (selectedFile) {
         avatarUrl = await backend.uploadAvatar(currentUser.id, selectedFile);
      }

      // 2. Update Profile with new URL (if changed) and other fields
      await backend.updateProfile(currentUser.id, {
         name: profileForm.name,
         avatar: avatarUrl,
         sector: profileForm.sector
      });
      
      setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setSelectedFile(null); // Clear file selection after success
    } catch (err: any) {
      // Check for common RLS error
      let msg = err.message || 'Erro ao atualizar perfil.';
      if (msg.includes('row-level security')) {
         msg = 'Erro de Permissão: Configure as Políticas (Policies) do Storage no Supabase para permitir Uploads.';
      }
      setProfileMessage({ type: 'error', text: msg });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwdMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setPwdLoading(true);
    setPwdMessage(null);

    try {
      await backend.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setPwdMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwdMessage({ type: 'error', text: err.message || 'Erro ao alterar senha. Verifique sua senha atual.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleCustomizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile && !faviconFile) {
       setCustomMessage({ type: 'error', text: 'Selecione pelo menos um arquivo para enviar.' });
       return;
    }

    setCustomLoading(true);
    setCustomMessage(null);

    try {
      if (logoFile) {
        await backend.uploadSystemAsset(logoFile, 'logo');
      }
      if (faviconFile) {
        await backend.uploadSystemAsset(faviconFile, 'favicon');
      }
      setCustomMessage({ type: 'success', text: 'Identidade visual atualizada com sucesso!' });
      setLogoFile(null);
      setFaviconFile(null);
    } catch (err: any) {
      let msg = err.message || 'Erro ao atualizar identidade.';
      if (msg.includes('row-level security')) {
         msg = 'Erro de Permissão: Verifique as políticas do bucket "images".';
      }
      setCustomMessage({ type: 'error', text: msg });
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 h-full overflow-y-auto custom-scrollbar"
    >
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <UserCog className="text-primary" size={28} />
          Meu Perfil
        </h2>
        <p className="text-slate-400 mt-2">Gerencie suas informações pessoais e credenciais de acesso.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-6xl">
        
        {/* --- Left Column: Identity Card --- */}
        <div className="xl:col-span-1">
          <div className="bg-navy-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 z-0"></div>
             
             <div className="relative z-10 mt-8 mb-4 group inline-block cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               <div className="relative w-32 h-32 mx-auto">
                 <img 
                   src={profileForm.avatar} 
                   alt="Avatar" 
                   className="w-full h-full rounded-full border-4 border-navy-800 shadow-2xl object-cover bg-navy-900"
                   onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=User'; }}
                 />
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                 </div>
               </div>
               {/* Hidden File Input */}
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
                 className="hidden" 
                 accept="image/*"
               />
               <p className="text-xs text-primary mt-2 group-hover:underline">Alterar foto</p>
             </div>
             
             <h3 className="text-xl font-bold text-white relative z-10">{currentUser.name}</h3>
             <p className="text-slate-400 text-sm mb-6 relative z-10">{currentUser.email}</p>

             <div className="flex flex-col gap-2">
               <div className="bg-navy-900/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
                 <ShieldCheck className="text-emerald-400" size={18} />
                 <div className="text-left">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Permissão</p>
                    <p className="text-sm text-slate-200 capitalize">{currentUser.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                 </div>
               </div>
               <div className="bg-navy-900/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
                 <UserCog className="text-blue-400" size={18} />
                 <div className="text-left">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Setor Atual</p>
                    <p className="text-sm text-slate-200">{currentUser.sector}</p>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* --- Right Column: Forms --- */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-800 pb-1 overflow-x-auto">
            <button
               onClick={() => setActiveTab('info')}
               className={`pb-3 px-2 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'info' ? 'text-primary' : 'text-slate-400 hover:text-white'}`}
            >
               Informações Pessoais
               {activeTab === 'info' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
             <button
               onClick={() => setActiveTab('security')}
               className={`pb-3 px-2 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'security' ? 'text-primary' : 'text-slate-400 hover:text-white'}`}
            >
               Segurança e Senha
               {activeTab === 'security' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
            <button
               onClick={() => setActiveTab('customization')}
               className={`pb-3 px-2 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'customization' ? 'text-primary' : 'text-slate-400 hover:text-white'}`}
            >
               Personalização (Logo)
               {activeTab === 'customization' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          </div>

          {/* Form: Personal Info */}
          {activeTab === 'info' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <form onSubmit={handleProfileSubmit} className="bg-navy-800/50 border border-slate-700 rounded-xl p-6 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Nome Completo</label>
                    <div className="relative">
                      <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text" 
                        value={profileForm.name}
                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                        className="w-full bg-navy-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                     <div className="relative opacity-60 cursor-not-allowed">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                       <input 
                         type="email" 
                         disabled
                         value={currentUser.email}
                         className="w-full bg-navy-900 border border-slate-700 text-slate-300 rounded-lg pl-10 pr-4 py-2.5 outline-none cursor-not-allowed"
                       />
                     </div>
                     <p className="text-[10px] text-slate-500 mt-1">O email não pode ser alterado manualmente.</p>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-400 mb-1.5">Setor</label>
                     <select
                        value={profileForm.sector}
                        onChange={e => setProfileForm({...profileForm, sector: e.target.value})}
                        className="w-full bg-navy-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                     >
                       <option value="">Selecione...</option>
                       {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                     </select>
                  </div>
                </div>

                {profileMessage && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${profileMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <span className={`w-2 h-2 rounded-full ${profileMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {profileMessage.text}
                  </div>
                )}

                <div className="flex justify-end">
                   <button 
                     type="submit"
                     disabled={profileLoading}
                     className="bg-primary hover:bg-sky-400 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                   >
                     {profileLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     Salvar Alterações
                   </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Form: Security */}
          {activeTab === 'security' && (
             <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
               <form onSubmit={handlePasswordSubmit} className="bg-navy-800/50 border border-slate-700 rounded-xl p-6 shadow-lg">
                 <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Senha Atual</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="password" 
                          required
                          value={passwordForm.oldPassword}
                          onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                          className="w-full bg-navy-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Digite sua senha antiga para confirmar"
                        />
                      </div>
                    </div>
                    
                    <hr className="border-slate-800 my-4" />

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="password" 
                          required
                          value={passwordForm.newPassword}
                          onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                          className="w-full bg-navy-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirmar Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          type="password" 
                          required
                          value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                          className="w-full bg-navy-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Repita a nova senha"
                        />
                      </div>
                    </div>
                 </div>

                 {pwdMessage && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${pwdMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <span className={`w-2 h-2 rounded-full ${pwdMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {pwdMessage.text}
                  </div>
                )}

                 <div className="flex justify-end">
                   <button 
                     type="submit"
                     disabled={pwdLoading}
                     className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                   >
                     {pwdLoading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                     Redefinir Senha
                   </button>
                </div>
               </form>
             </motion.div>
          )}

          {/* Form: Customization */}
          {activeTab === 'customization' && (
             <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
               <form onSubmit={handleCustomizationSubmit} className="bg-navy-800/50 border border-slate-700 rounded-xl p-6 shadow-lg">
                 <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg mb-6 flex items-start gap-3">
                    <Palette className="text-blue-400 shrink-0 mt-1" size={18} />
                    <div className="text-sm text-slate-300">
                       <p className="font-medium text-white mb-1">Identidade Visual do Sistema</p>
                       <p className="text-xs text-slate-400">As alterações feitas aqui serão visíveis para <strong>todos os usuários</strong> da plataforma. Use imagens com fundo transparente (PNG) para a logo.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-6 mb-6">
                    {/* Logo Upload */}
                    <div>
                       <label className="block text-sm font-medium text-slate-400 mb-2">Logo do Sistema (Sidebar)</label>
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-navy-900 border border-dashed border-slate-600 rounded-lg flex items-center justify-center overflow-hidden">
                             {logoFile ? (
                               <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-contain p-1" />
                             ) : backend.settings.logoUrl ? (
                               <img src={backend.settings.logoUrl} className="w-full h-full object-contain p-1" />
                             ) : (
                               <ImageIcon className="text-slate-600" />
                             )}
                          </div>
                          <div className="flex-1">
                             <input 
                               type="file" 
                               accept="image/png, image/jpeg, image/svg+xml"
                               id="logo-upload"
                               className="hidden"
                               onChange={(e) => e.target.files && setLogoFile(e.target.files[0])}
                             />
                             <label 
                               htmlFor="logo-upload"
                               className="cursor-pointer inline-flex items-center gap-2 bg-navy-900 border border-slate-700 hover:bg-navy-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
                             >
                               <Upload size={14} />
                               Selecionar Imagem (PNG/SVG)
                             </label>
                             <p className="text-[10px] text-slate-500 mt-1.5 ml-1">Recomendado: 200x200px (Fundo Transparente)</p>
                          </div>
                       </div>
                    </div>
                    
                    <hr className="border-slate-800" />

                    {/* Favicon Upload */}
                    <div>
                       <label className="block text-sm font-medium text-slate-400 mb-2">Favicon (Ícone do Navegador)</label>
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-navy-900 border border-dashed border-slate-600 rounded-lg flex items-center justify-center overflow-hidden">
                             {faviconFile ? (
                               <img src={URL.createObjectURL(faviconFile)} className="w-8 h-8 object-contain" />
                             ) : backend.settings.faviconUrl ? (
                               <img src={backend.settings.faviconUrl} className="w-8 h-8 object-contain" />
                             ) : (
                               <ImageIcon className="text-slate-600" size={20} />
                             )}
                          </div>
                          <div className="flex-1">
                             <input 
                               type="file" 
                               accept="image/x-icon, image/png"
                               id="favicon-upload"
                               className="hidden"
                               onChange={(e) => e.target.files && setFaviconFile(e.target.files[0])}
                             />
                             <label 
                               htmlFor="favicon-upload"
                               className="cursor-pointer inline-flex items-center gap-2 bg-navy-900 border border-slate-700 hover:bg-navy-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
                             >
                               <Upload size={14} />
                               Selecionar Ícone (.ico / .png)
                             </label>
                             <p className="text-[10px] text-slate-500 mt-1.5 ml-1">Recomendado: 32x32px ou 64x64px</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {customMessage && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${customMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <span className={`w-2 h-2 rounded-full ${customMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {customMessage.text}
                  </div>
                )}

                 <div className="flex justify-end">
                   <button 
                     type="submit"
                     disabled={customLoading || (!logoFile && !faviconFile)}
                     className="bg-primary hover:bg-sky-400 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                   >
                     {customLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     Salvar Identidade
                   </button>
                </div>
               </form>
             </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
};
