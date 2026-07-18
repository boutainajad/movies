import { saveFavorites, saveWatchlist } from '../services/storage.js';

export function attachWatchlist(app) {
    app.renderWatchlist = function () {
        this.stopHeroRotation();
        if (this._heroWrapper) this._heroWrapper.innerHTML = '';
        if (this._grid) this._grid.innerHTML = '';
        if (this._mobileGenres) this._mobileGenres.style.display = 'none';

        if (this.state.watchlist.length === 0) {
            if (this._grid) this._grid.innerHTML = '<p class="empty-msg">Votre watchlist est vide.</p>';
        } else {
            this.renderGrid(this.state.watchlist);
        }
    };

    app.renderFavorites = function () {
        this.stopHeroRotation();
        if (this._heroWrapper) this._heroWrapper.innerHTML = '';
        if (this._grid) this._grid.innerHTML = '';
        if (this._mobileGenres) this._mobileGenres.style.display = 'none';

        if (this._grid) this._grid.style.display = 'grid';
        if (this._sectionHeader) this._sectionHeader.style.display = 'flex';
        const sectionsContainer = document.getElementById('home-sections');
        if (sectionsContainer) sectionsContainer.innerHTML = '';

        if (this.state.favorites.length === 0) {
            if (this._grid) this._grid.innerHTML = '<p class="empty-msg favorites">Vous n\'avez aucun favori.</p>';
        } else {
            this.renderGrid(this.state.favorites);
        }
    };

    app.isFavorite = function (id, type) {
        const typeKey = type || 'movie';
        return this.state.favorites.some(item => (item.type || 'movie') === typeKey && item.id.toString() === id.toString());
    };

    function favKey(item) {
        return `${(item?.type || 'movie').toString()}:${item?.id?.toString()}`;
    }


    app.toggleFavorite = function (item, btnEl) {
        const key = favKey(item);
        const index = this.state.favorites.findIndex(i => favKey(i) === key);
        let added = false;


        if (index > -1) {
            this.state.favorites.splice(index, 1);
            this.showToast('Retiré des favoris !', 'success');
        } else {
            this.state.favorites.unshift(item);
            added = true;
            this.showToast('Ajouté aux favoris !', 'success');
        }

        saveFavorites(this.state.favorites);

        if (btnEl) {
            btnEl.classList.toggle('active', added);
            btnEl.title = added ? 'Retirer des favoris' : 'Ajouter aux favoris';
            const icon = btnEl.querySelector('i');
            if (icon) icon.className = `fa-${added ? 'solid' : 'regular'} fa-heart`;
        }

        const targetKey = key;
        document.querySelectorAll(`.btn-fav[data-fav-id][data-fav-type]`).forEach(btn => {
            if (btn === btnEl) return;
            const btnKey = `${(btn.dataset.favType || 'movie').toString()}:${(btn.dataset.favId || '').toString()}`;
            if (btnKey !== targetKey) return;

            btn.classList.toggle('active', added);
            btn.title = added ? 'Retirer des favoris' : 'Ajouter aux favoris';
            const icon = btn.querySelector('i');
            if (icon) icon.className = `fa-${added ? 'solid' : 'regular'} fa-heart`;
        });


        if (this.state.currentView === 'favorites') {
            this.renderFavorites();
        }

        return added;
    };

    app.isInWatchlist = function (id) {
        return this.state.watchlist.some(item => item.id.toString() === id.toString());
    };

    app.toggleWatchlist = function (item) {
        const index = this.state.watchlist.findIndex(i => i.id.toString() === item.id.toString());
        let added = false;

        if (index > -1) {
            this.state.watchlist.splice(index, 1);
            this.showToast('Retiré de la watchlist !', 'success');
        } else {
            if (!this.isInWatchlist(item.id)) {
                this.state.watchlist.push(item);
                added = true;
                this.showToast('Ajouté à la watchlist !', 'success');
            }
        }

        saveWatchlist(this.state.watchlist);

        if (this.state.currentView === 'watchlist') {
            this.renderWatchlist();
        }

        return added;
    };

    app.showToast = function (message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastFadeOut 0.3s forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2700);
    };
}
